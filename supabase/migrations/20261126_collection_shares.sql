-- BookLog sharing, Part 2: fixed collection shares (tabs or full library).
-- PREVIEW FIRST. Additive only: two new tables and two new functions.
-- No existing table, row, policy or function is changed.
-- Do not run on production until the owner approves the tested Part 2 release.
begin;

-- One row per share link. Fixed snapshot (decision D1): the books ticked at share time.
create table public.collection_shares (
  token uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  -- 'books' today; Stats can be added later as a new kind (board 4, deferred).
  kind text not null default 'books' check (kind in ('books')),
  -- On Hold is never a shared source.
  sources text[] not null check (cardinality(sources) between 1 and 4 and sources <@ array['recommended','reading','queued','completed']::text[]),
  full_library boolean not null default false,
  created_at timestamptz not null default now()
);

-- The ticked books, copied at share time. Never notes, ratings or dates.
create table public.collection_share_items (
  token uuid not null references public.collection_shares(token) on delete cascade,
  source text not null check (source in ('recommended','reading','queued','completed')),
  book_id text not null check (length(book_id) between 1 and 500),
  title text not null check (length(trim(title)) between 1 and 500),
  author text not null default '' check (length(author) <= 500),
  cover text not null default '' check (length(cover) <= 2000 and (cover = '' or cover like 'https://%')),
  position integer not null check (position >= 1),
  primary key (token, source, book_id)
);

-- No direct table access for anyone. Everything goes through the two functions below.
alter table public.collection_shares enable row level security;
alter table public.collection_share_items enable row level security;
revoke all on public.collection_shares from public, anon, authenticated;
revoke all on public.collection_share_items from public, anon, authenticated;

-- Create a share from the caller's own books. Titles, authors and covers are copied
-- from the caller's library on the server, never taken from the request.
-- p_books: [{"source":"queued","book_id":"..."}, ...] in display order.
create function public.create_collection_share(p_sources text[], p_full_library boolean, p_books jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_token uuid;
  v_requested integer;
  v_inserted integer;
  v_available integer;
begin
  if v_uid is null then raise exception 'Log in to share.'; end if;
  select trim(p.name) into v_name from public.profiles p where p.user_id = v_uid;
  if v_name is null or v_name = '' then raise exception 'Add your display name in Settings before sharing.'; end if;
  if p_sources is null or cardinality(p_sources) not between 1 and 4
     or not (p_sources <@ array['recommended','reading','queued','completed']::text[]) then
    raise exception 'Choose what to share.';
  end if;
  if jsonb_typeof(p_books) is distinct from 'array' then raise exception 'Choose at least one book.'; end if;
  v_requested := jsonb_array_length(p_books);
  if v_requested not between 1 and 3000 then raise exception 'Choose at least one book.'; end if;

  insert into public.collection_shares (owner_id, display_name, sources, full_library)
  values (v_uid, left(v_name, 80), p_sources, coalesce(p_full_library, false))
  returning token into v_token;

  insert into public.collection_share_items (token, source, book_id, title, author, cover, position)
  select v_token, lower(b.status), b.id, b.title, left(coalesce(b.author, ''), 500),
         case when b.cover_url like 'https://%' and length(b.cover_url) <= 2000 then b.cover_url else '' end,
         x.ord
  from jsonb_array_elements(p_books) with ordinality as x(item, ord)
  join public.books b
    on b.user_id = v_uid
   and b.id = x.item->>'book_id'
   and lower(b.status) = x.item->>'source'
  where x.item->>'source' = any (p_sources);
  get diagnostics v_inserted = row_count;
  -- Every requested book must be the caller's and on a chosen tab right now.
  if v_inserted <> v_requested then raise exception 'Some books have changed. Refresh and try again.'; end if;

  -- "Full library" only when all four tabs are chosen and no book was left out.
  if coalesce(p_full_library, false) then
    if not (p_sources @> array['recommended','reading','queued','completed']::text[]) then
      raise exception 'Full library must include Reading, Queued, Completed and Recommendations.';
    end if;
    select count(*) into v_available from public.books b
     where b.user_id = v_uid and lower(b.status) in ('recommended','reading','queued','completed');
    if v_available <> v_inserted then raise exception 'Some books have changed. Refresh and try again.'; end if;
  end if;

  return v_token;
end $$;

-- Read a share by its exact token. Books the sender has since removed from that tab
-- are left out (decision D1). Books added later never appear. No book ids, owner id,
-- notes, ratings or dates are returned.
create function public.read_collection_share(p_token uuid)
returns table (display_name text, full_library boolean, sources text[], source text, title text, author text, cover text, position integer)
language sql stable security definer set search_path = '' as $$
  select s.display_name, s.full_library, s.sources, i.source, i.title, i.author, i.cover, i.position
  from public.collection_shares s
  left join public.collection_share_items i
    on i.token = s.token
   and exists (select 1 from public.books b
                where b.user_id = s.owner_id and b.id = i.book_id and lower(b.status) = i.source)
  where s.token = p_token
  order by i.source, i.position;
$$;

revoke all on function public.create_collection_share(text[], boolean, jsonb) from public, anon, authenticated;
revoke all on function public.read_collection_share(uuid) from public, anon, authenticated;
grant execute on function public.create_collection_share(text[], boolean, jsonb) to authenticated;
grant execute on function public.read_collection_share(uuid) to anon, authenticated;

commit;
