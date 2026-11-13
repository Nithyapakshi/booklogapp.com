-- Email unsubscribe. PREVIEW FIRST, then production after owner approval.
-- Additive only: one new table and two new functions. No existing table, row, policy or function changes.
-- Every account gets a random unsubscribe token. The email link carries only that token, never the
-- account id or email address. Unsubscribing needs no sign-in and touches nothing in the library.
begin;

create table public.email_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

-- No reader or anonymous access to the table. Only the owner (SQL editor) reads tokens to send emails.
alter table public.email_preferences enable row level security;
revoke all on public.email_preferences from public, anon, authenticated;

-- One row per existing account. The sender adds rows for newer accounts before each send:
--   insert into public.email_preferences (user_id) select id from auth.users on conflict do nothing;
insert into public.email_preferences (user_id) select id from auth.users on conflict do nothing;

-- Exact-token unsubscribe. Returns true for a known token (also when already unsubscribed),
-- false for an unknown one. Records email.unsubscribed once, the first time only.
create function public.unsubscribe_email(p_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_was timestamptz;
begin
  select user_id, unsubscribed_at into v_user, v_was
    from public.email_preferences where unsubscribe_token = p_token;
  if v_user is null then return false; end if;
  if v_was is null then
    update public.email_preferences set unsubscribed_at = now() where user_id = v_user;
    perform public.usage_record(v_user, 'email.unsubscribed', null, '{}'::jsonb);
  end if;
  return true;
end $$;
revoke all on function public.unsubscribe_email(uuid) from public;
grant execute on function public.unsubscribe_email(uuid) to anon, authenticated;

commit;
