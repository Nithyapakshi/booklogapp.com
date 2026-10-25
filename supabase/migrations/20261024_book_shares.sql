-- Additive. Apply PREVIEW only after owner approval. No existing table/policy changes.
create table public.book_shares (
  token uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  title text not null check (length(trim(title)) between 1 and 500),
  author text not null check (length(trim(author)) between 1 and 500),
  cover text not null default '' check (length(cover) <= 2000 and (cover = '' or cover like 'https://%')),
  created_at timestamptz not null default now()
);
alter table public.book_shares enable row level security;
-- No anonymous table SELECT or list API. Only exact-token RPC returns a minimal snapshot.
revoke all on public.book_shares from anon, authenticated;
create policy book_shares_owner_insert on public.book_shares for insert to authenticated with check (owner_id = auth.uid());
create policy book_shares_owner_read on public.book_shares for select to authenticated using (owner_id = auth.uid());
grant select, insert on public.book_shares to authenticated;
create function public.read_book_share(p_token uuid)
returns table(display_name text, title text, author text, cover text)
language sql stable security definer set search_path = '' as $$
  select s.display_name, s.title, s.author, s.cover from public.book_shares s where s.token = p_token;
$$;
revoke all on function public.read_book_share(uuid) from public;
grant execute on function public.read_book_share(uuid) to anon, authenticated;
