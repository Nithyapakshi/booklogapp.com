-- Usage tracking: one append-only log of what readers do, so every feature can be measured.
-- PREVIEW FIRST. Additive only: a new table, new trigger functions and a view. No existing row or
-- function changes. Every recording step swallows its own errors, so a reader's save can never fail
-- because of it. Nothing private is recorded: no note text, no search words, no email.
begin;

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event text not null check (event ~ '^[a-z_]+\.[a-z_]+$' and length(event) <= 64),
  source text not null default 'app' check (source in ('app', 'db')),
  book_id text check (book_id is null or length(book_id) <= 500),
  detail jsonb not null default '{}'::jsonb check (pg_column_size(detail) <= 2000),
  txid bigint,
  created_at timestamptz not null default now()
);
create index usage_events_created_idx on public.usage_events (created_at);
create index usage_events_event_idx on public.usage_events (event, created_at);
create index usage_events_user_idx on public.usage_events (user_id, created_at);

-- Readers may add only their own app events. Nobody but the owner (service role / SQL editor) can read.
alter table public.usage_events enable row level security;
revoke all on public.usage_events from public, anon, authenticated;
grant insert (event, book_id, detail) on public.usage_events to authenticated;
create policy usage_events_insert_own on public.usage_events for insert to authenticated
  with check (user_id = auth.uid() and source = 'app');

-- One safe writer for the triggers. Runs as the table owner; any error is swallowed.
create function public.usage_record(p_user uuid, p_event text, p_book text, p_detail jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  insert into public.usage_events (user_id, event, source, book_id, detail, txid)
  values (p_user, p_event, 'db', p_book, coalesce(p_detail, '{}'::jsonb), txid_current());
exception when others then
  return;
end $$;
revoke all on function public.usage_record(uuid, text, text, jsonb) from public, anon, authenticated;

-- books: a move is a delete of one shelf row and an insert of another in the same transaction,
-- so rows are logged per shelf with the transaction id; the view below turns them into actions.
create function public.usage_books() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_op = 'INSERT' then
      perform public.usage_record(new.user_id, 'shelf.added', new.id,
        jsonb_build_object('shelf', new.status, 'auto', coalesce(new.auto_completed, false)));
    elsif tg_op = 'DELETE' then
      perform public.usage_record(old.user_id, 'shelf.removed', old.id, jsonb_build_object('shelf', old.status));
    else
      if new.self_rating is distinct from old.self_rating then
        perform public.usage_record(new.user_id, 'book.rated', new.id,
          jsonb_build_object('shelf', new.status, 'was_blank', coalesce(old.self_rating, 0) = 0));
      end if;
      if new.finished_at is distinct from old.finished_at then
        perform public.usage_record(new.user_id, 'book.finish_date_set', new.id,
          jsonb_build_object('shelf', new.status, 'was_blank', old.finished_at is null, 'cleared', new.finished_at is null));
      end if;
      if new.started_at is distinct from old.started_at then
        perform public.usage_record(new.user_id, 'book.start_date_set', new.id,
          jsonb_build_object('shelf', new.status, 'was_blank', old.started_at is null, 'cleared', new.started_at is null));
      end if;
      -- Only reader edits; automatic cover/description/genre/year fills are not reader actions.
      if new.title is distinct from old.title or new.author is distinct from old.author then
        perform public.usage_record(new.user_id, 'book.edited', new.id, jsonb_build_object('shelf', new.status));
      end if;
    end if;
  exception when others then
    null;
  end;
  return null;
end $$;
create trigger zz_usage_books after insert or update or delete on public.books
  for each row execute function public.usage_books();

create function public.usage_notes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_op = 'DELETE' then
      perform public.usage_record(old.user_id, 'note.removed', old.book_id, '{}'::jsonb);
    elsif tg_op = 'INSERT' or new.notes is distinct from old.notes then
      perform public.usage_record(new.user_id, 'note.saved', new.book_id,
        jsonb_build_object('empty', coalesce(btrim(new.notes), '') = ''));
    end if;
  exception when others then null;
  end;
  return null;
end $$;
create trigger zz_usage_notes after insert or update or delete on public.book_notes
  for each row execute function public.usage_notes();

create function public.usage_next_read() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_op = 'DELETE' then
      perform public.usage_record(old.user_id, 'next_read.cleared', old.book_id, '{}'::jsonb);
    else
      perform public.usage_record(new.user_id, 'next_read.set', new.book_id, '{}'::jsonb);
    end if;
  exception when others then null;
  end;
  return null;
end $$;
create trigger zz_usage_next_read after insert or update or delete on public.next_read
  for each row execute function public.usage_next_read();

create function public.usage_book_shares() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform public.usage_record(new.owner_id, 'share.book_created', null, '{}'::jsonb);
  exception when others then null;
  end;
  return null;
end $$;
create trigger zz_usage_book_shares after insert on public.book_shares
  for each row execute function public.usage_book_shares();

-- Profile changes: which fields changed, and the new visibility/sharing setting (not names or email).
create function public.usage_profiles() returns trigger
language plpgsql security definer set search_path = '' as $$
declare changed text[] := '{}';
begin
  begin
    if new.name is distinct from old.name then changed := changed || 'name'; end if;
    if new.username is distinct from old.username then changed := changed || 'username'; end if;
    if new.profile_visibility is distinct from old.profile_visibility then changed := changed || 'visibility'; end if;
    if new.share_mode is distinct from old.share_mode then changed := changed || 'share_mode'; end if;
    if new.avatar_url is distinct from old.avatar_url then changed := changed || 'avatar'; end if;
    if cardinality(changed) > 0 then
      perform public.usage_record(new.user_id, 'profile.updated', null,
        jsonb_build_object('fields', to_jsonb(changed), 'visibility', new.profile_visibility, 'share_mode', new.share_mode));
    end if;
  exception when others then null;
  end;
  return null;
end $$;
create trigger zz_usage_profiles after update on public.profiles
  for each row execute function public.usage_profiles();

create function public.usage_feedback() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform public.usage_record(new.user_id, 'feedback.sent', null, jsonb_build_object('kind', new.kind));
  exception when others then null;
  end;
  return null;
end $$;
-- The feedback table exists on production but not on every test database.
do $$ begin
  if to_regclass('public.feedback') is not null then
    create trigger zz_usage_feedback after insert on public.feedback
      for each row execute function public.usage_feedback();
  end if;
end $$;

revoke all on function public.usage_books(), public.usage_notes(), public.usage_next_read(),
  public.usage_book_shares(), public.usage_profiles(), public.usage_feedback() from public, anon, authenticated;

-- Reader actions on books, one row per action: added, moved or removed (from shelf rows in one transaction).
create view public.usage_book_actions with (security_invoker = true) as
select
  min(created_at) as created_at,
  user_id,
  book_id,
  case
    when bool_or(event = 'shelf.added') and bool_or(event = 'shelf.removed') then 'book.moved'
    when bool_or(event = 'shelf.added') then 'book.added'
    else 'book.removed'
  end as action,
  array_agg(detail->>'shelf') filter (where event = 'shelf.removed') as from_shelves,
  array_agg(detail->>'shelf') filter (where event = 'shelf.added' and not coalesce((detail->>'auto')::boolean, false)) as to_shelves
from public.usage_events
where event in ('shelf.added', 'shelf.removed')
group by user_id, book_id, txid;
revoke all on public.usage_book_actions from public, anon, authenticated;

commit;
