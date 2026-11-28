-- Demo accounts for organiser outreach (booklogapp.com/demo/<slug>). PREVIEW FIRST; production only after
-- the owner's explicit go.
-- Additive only: new tables and new functions. No existing table, row, policy, function or trigger changes.
--
-- What it does:
-- - demo_accounts: which auth users are demo accounts, by organiser slug (for example "safar").
-- - is_demo_account() / my_demo_slug(): the signed-in reader asks about their own account only.
-- - ask_ai_allow(): the Ask AI gate for every reader: the token's session must still exist and the user must not be
--   banned. Real readers: no cap, nothing recorded. Demo accounts: atomic count of today's attempts, refuses the
--   16th and refuses when the demo is switched off.
-- - demo_signin_slot(slug): the only thing the anonymous demo link may call. 'ok' only for an active slug and
--   while fewer than 20 demo sign-ins happened in the current 5-minute window (all demos together), so the
--   demo link can never push the server's sign-ins into Supabase's auth rate limits.
-- - demo_seed_books + reset_demo(user_id): put a demo library back to its 16 sample books.
-- No password, email or token is stored anywhere in these tables.
begin;

create table public.demo_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,40}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.demo_accounts enable row level security;
revoke all on public.demo_accounts from public, anon, authenticated;

-- Ask AI attempts per demo account per UTC day.
create table public.demo_ai_calls (
  user_id uuid not null references public.demo_accounts(user_id) on delete cascade,
  day date not null,
  calls integer not null check (calls between 1 and 15),
  primary key (user_id, day)
);
alter table public.demo_ai_calls enable row level security;
revoke all on public.demo_ai_calls from public, anon, authenticated;

-- Demo sign-ins per 5-minute window, all demos together.
create table public.demo_signin_windows (
  window_start timestamptz primary key,
  signins integer not null check (signins between 1 and 20)
);
alter table public.demo_signin_windows enable row level security;
revoke all on public.demo_signin_windows from public, anon, authenticated;

-- The sample library every demo is reset to. Dates are kept as "days ago" so the library always looks current.
create table public.demo_seed_books (
  position integer primary key,
  id text not null check (length(id) between 1 and 500),
  title text not null,
  author text not null,
  status text not null check (status in ('reading', 'queued', 'completed', 'recommended', 'onHold')),
  self_rating numeric check (self_rating is null or self_rating between 1 and 5),
  started_days_ago integer,
  finished_days_ago integer,
  progress_percent numeric(5,2) check (progress_percent is null or progress_percent between 0 and 100),
  is_next boolean not null default false,
  note text,
  genre text,
  cover_url text not null default '',
  description text,
  published_year integer,
  unique (id, status)
);
alter table public.demo_seed_books enable row level security;
revoke all on public.demo_seed_books from public, anon, authenticated;

create function public.is_demo_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.demo_accounts where user_id = auth.uid());
$$;

create function public.my_demo_slug() returns text
language sql stable security definer set search_path = '' as $$
  select slug from public.demo_accounts where user_id = auth.uid() and active;
$$;

-- The Ask AI gate, for every reader. Runs through PostgREST, which has already checked the token's signature and
-- expiry. Here: the token's session must still exist (signed out / revoked sessions are refused at once) and the
-- user must not be banned. Real readers: nothing else, nothing recorded. Demo accounts: refused when switched
-- off, then an atomic count of today's attempts (the insert-or-increment holds the row lock on (user_id, day), so
-- two clicks at the same time are counted one after the other; no row back = the 16th: refuse).
-- No call to the Auth server, so Ask AI does not use the server's /auth/v1/user rate-limit bucket.
create function public.ask_ai_allow() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  sid uuid;
  is_active boolean;
  n integer;
begin
  if uid is null then return false; end if;
  begin
    sid := (auth.jwt() ->> 'session_id')::uuid;
  exception when others then
    return false;
  end;
  if sid is null then return false; end if;
  if not exists (select 1 from auth.sessions s where s.id = sid and s.user_id = uid and (s.not_after is null or s.not_after > now())) then
    return false;
  end if;
  if exists (select 1 from auth.users u where u.id = uid and u.banned_until is not null and u.banned_until > now()) then
    return false;
  end if;
  select active into is_active from public.demo_accounts where user_id = uid;
  if not found then return true; end if;          -- a real reader: no cap, nothing recorded
  if not is_active then return false; end if;
  insert into public.demo_ai_calls as c (user_id, day, calls)
  values (uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set calls = c.calls + 1 where c.calls < 15
  returning c.calls into n;
  return n is not null;
end $$;

-- 'ok' = sign in now; 'busy' = the 5-minute window is full; 'unavailable' = not an active demo slug.
create function public.demo_signin_slot(p_slug text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := date_bin('5 minutes', now(), timestamptz '2000-01-01 00:00:00+00');
  n integer;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9-]{1,40}$' then return 'unavailable'; end if;
  if not exists (select 1 from public.demo_accounts where slug = p_slug and active) then return 'unavailable'; end if;
  delete from public.demo_signin_windows where window_start < now() - interval '1 day';
  insert into public.demo_signin_windows as s (window_start, signins) values (w, 1)
  on conflict (window_start) do update set signins = s.signins + 1 where s.signins < 20
  returning s.signins into n;
  return case when n is null then 'busy' else 'ok' end;
end $$;

-- Manual (and, on preview, nightly) reset. Books only: never touches the password, sessions, demo_accounts
-- or the AI call counts. Covers and descriptions the app filled in on open are kept in the seed first, so
-- later resets come back with covers.
create function public.reset_demo(p_user uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if not exists (select 1 from public.demo_accounts where user_id = p_user) then
    raise exception 'Not a demo account';
  end if;

  update public.demo_seed_books s set
    cover_url = case when s.cover_url = '' then coalesce(nullif(b.cover_url, ''), '') else s.cover_url end,
    description = coalesce(nullif(s.description, ''), nullif(b.description, '')),
    genre = coalesce(nullif(s.genre, ''), nullif(b.genre, '')),
    published_year = coalesce(s.published_year, b.published_year)
  from public.books b
  where b.user_id = p_user and b.id = s.id and b.status = s.status;

  delete from public.reading_progress where user_id = p_user;
  delete from public.next_read where user_id = p_user;
  delete from public.book_notes where user_id = p_user;
  delete from public.books where user_id = p_user;

  insert into public.books (user_id, id, title, author, status, self_rating, started_at, finished_at,
    started_precision, finished_precision, genre, cover_url, description, published_year, created_at)
  select p_user, s.id, s.title, s.author, s.status, s.self_rating,
    case when s.started_days_ago is null then null else current_date - s.started_days_ago end,
    case when s.finished_days_ago is null then null else current_date - s.finished_days_ago end,
    'month', 'month', s.genre, s.cover_url, s.description, s.published_year,
    now() - make_interval(mins => s.position)
  from public.demo_seed_books s order by s.position;
  get diagnostics n = row_count;

  insert into public.book_notes (user_id, book_id, notes)
  select distinct on (s.id) p_user, s.id, s.note from public.demo_seed_books s
  where s.note is not null and s.note <> '' order by s.id, s.position;

  insert into public.reading_progress (user_id, book_id, mode, percent)
  select p_user, s.id, 'percent', s.progress_percent from public.demo_seed_books s
  where s.status = 'reading' and s.progress_percent is not null;

  insert into public.next_read (user_id, book_id)
  select p_user, s.id from public.demo_seed_books s where s.is_next and s.status = 'queued' limit 1;

  -- The usage triggers logged this reset's own deletes and inserts as reader actions. They are not, so only the
  -- rows written by THIS transaction (txid_current) are removed. Every earlier usage_events row of the demo account
  -- (demo.opened, visitor ids, signup clicks, real visitor actions) is kept.
  delete from public.usage_events where user_id = p_user and source = 'db' and txid = txid_current();
  return n;
end $$;

-- Usage without demo accounts, for every real-reader metric (docs/usage-queries.sql). Owner only.
create view public.usage_events_real with (security_invoker = true) as
  select e.* from public.usage_events e
  where not exists (select 1 from public.demo_accounts d where d.user_id = e.user_id);
create view public.usage_book_actions_real with (security_invoker = true) as
  select a.* from public.usage_book_actions a
  where not exists (select 1 from public.demo_accounts d where d.user_id = a.user_id);
revoke all on public.usage_events_real, public.usage_book_actions_real from public, anon, authenticated;

revoke all on function public.is_demo_account(), public.my_demo_slug(), public.ask_ai_allow(),
  public.demo_signin_slot(text), public.reset_demo(uuid) from public, anon, authenticated;
grant execute on function public.is_demo_account(), public.my_demo_slug(), public.ask_ai_allow() to authenticated;
grant execute on function public.demo_signin_slot(text) to anon, authenticated;
-- reset_demo: owner only (SQL editor, connector, or the preview schedule).

commit;
