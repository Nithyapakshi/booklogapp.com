-- Marketing email consent. PREVIEW FIRST, then production only after owner approval.
-- Additive only: four new nullable columns on email_preferences, one new table, new functions and
-- one new trigger on auth.users. No existing table, row, policy, function or trigger is changed.
--
-- Rules:
-- - A reader is on the marketing list only when marketing_opt_in = true AND unsubscribed_at is null.
--   A null unsubscribed_at alone is NOT consent.
-- - Consent is always a clear action by the reader (unticked checkbox, a tapped button, a switch).
-- - The exact words shown are stored with every choice. The words come from the server
--   (marketing_consent_text), never from the browser.
-- - Every choice is appended to email_consent_log, which is never updated or deleted by readers.
-- - Nothing here can block signup or sign-in: the signup trigger swallows its own errors.
-- - Readers cannot read or write these tables directly; they go through the functions below.
begin;

alter table public.email_preferences
  add column if not exists marketing_opt_in boolean,               -- null = never asked
  add column if not exists marketing_choice_at timestamptz,
  add column if not exists marketing_choice_source text,
  add column if not exists marketing_prompt_dismissed_at timestamptz;

alter table public.email_preferences drop constraint if exists email_preferences_choice_source_known;
alter table public.email_preferences add constraint email_preferences_choice_source_known
  check (marketing_choice_source is null or marketing_choice_source in ('signup', 'login_prompt', 'welcome_step', 'settings'));

create table if not exists public.email_consent_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice boolean not null,
  consent_text text not null,
  consent_version text not null,
  source text not null check (source in ('signup', 'login_prompt', 'welcome_step', 'settings')),
  created_at timestamptz not null default now()
);
create index if not exists email_consent_log_user_idx on public.email_consent_log (user_id, created_at desc);

-- Same lock-down as email_preferences: no direct reader or anonymous access at all.
alter table public.email_consent_log enable row level security;
revoke all on public.email_consent_log from public, anon, authenticated;

-- The exact words shown to the reader, by version. Add a new version for any wording change;
-- never edit an existing one, so the log always matches what was on screen.
create or replace function public.marketing_consent_text(p_version text)
returns text language sql immutable set search_path = '' as $$
  select case p_version
    when 'v1' then 'Get book recommendations and new features by email. Unsubscribe anytime.'
  end
$$;

-- Internal writer. Not callable by readers.
create or replace function public.marketing_record_choice(p_user uuid, p_choice boolean, p_source text, p_version text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_text text := public.marketing_consent_text(p_version);
begin
  if p_user is null or p_choice is null or v_text is null
     or p_source not in ('signup', 'login_prompt', 'welcome_step', 'settings') then
    return false;
  end if;
  insert into public.email_preferences (user_id) values (p_user) on conflict do nothing;
  update public.email_preferences
     set marketing_opt_in = p_choice,
         marketing_choice_at = now(),
         marketing_choice_source = p_source,
         -- A fresh, explicit yes after an earlier unsubscribe re-subscribes; a no never touches it.
         unsubscribed_at = case when p_choice then null else unsubscribed_at end
   where user_id = p_user;
  insert into public.email_consent_log (user_id, choice, consent_text, consent_version, source)
  values (p_user, p_choice, v_text, p_version, p_source);
  perform public.usage_record(p_user, case when p_choice then 'email.marketing_yes' else 'email.marketing_no' end,
                              null, jsonb_build_object('source', p_source, 'version', p_version));
  return true;
end $$;
revoke all on function public.marketing_record_choice(uuid, boolean, text, text) from public, anon, authenticated;

-- Signed-in reader records a choice (login prompt, Google welcome step, Settings switch).
create or replace function public.set_marketing_preference(p_choice boolean, p_source text, p_version text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_source = 'signup' then return false; end if;
  return public.marketing_record_choice(auth.uid(), p_choice, p_source, p_version);
end $$;
revoke all on function public.set_marketing_preference(boolean, text, text) from public, anon;
grant execute on function public.set_marketing_preference(boolean, text, text) to authenticated;

-- Reader closed the prompt without choosing: not consent, and the prompt is not shown again.
-- The Settings switch stays available as the way back.
create or replace function public.dismiss_marketing_prompt(p_source text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_source not in ('login_prompt', 'welcome_step') then return; end if;
  insert into public.email_preferences (user_id) values (auth.uid()) on conflict do nothing;
  update public.email_preferences set marketing_prompt_dismissed_at = now()
   where user_id = auth.uid() and marketing_prompt_dismissed_at is null;
  perform public.usage_record(auth.uid(), 'email.prompt_dismissed', null, jsonb_build_object('source', p_source));
end $$;
revoke all on function public.dismiss_marketing_prompt(text) from public, anon;
grant execute on function public.dismiss_marketing_prompt(text) to authenticated;

-- What the app needs to know, and nothing more (no token, no timestamps).
-- subscribed: on the marketing list. ask: show the one-time prompt.
create or replace function public.get_marketing_preference()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  r record;
begin
  if auth.uid() is null then return null; end if;
  select marketing_opt_in, marketing_prompt_dismissed_at, unsubscribed_at into r
    from public.email_preferences where user_id = auth.uid();
  return jsonb_build_object(
    'subscribed', coalesce(r.marketing_opt_in, false) and r.unsubscribed_at is null,
    'ask', r.marketing_opt_in is null and r.marketing_prompt_dismissed_at is null and r.unsubscribed_at is null
  );
end $$;
revoke all on function public.get_marketing_preference() from public, anon;
grant execute on function public.get_marketing_preference() to authenticated;

-- New accounts: create the email_preferences row and record the signup checkbox, if the form sent one.
-- The browser sends only marketing_opt_in ("true"/"false") and consent_version in the signup metadata.
-- Errors are swallowed: signup must never fail because of this.
create or replace function public.marketing_on_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_choice text := new.raw_user_meta_data ->> 'marketing_opt_in';
begin
  begin
    insert into public.email_preferences (user_id) values (new.id) on conflict do nothing;
    if v_choice in ('true', 'false') then
      perform public.marketing_record_choice(new.id, v_choice = 'true', 'signup', new.raw_user_meta_data ->> 'consent_version');
    end if;
  exception when others then
    null;
  end;
  return new;
end $$;
revoke all on function public.marketing_on_signup() from public, anon, authenticated;

drop trigger if exists marketing_on_signup on auth.users;
create trigger marketing_on_signup after insert on auth.users
  for each row execute function public.marketing_on_signup();

commit;
