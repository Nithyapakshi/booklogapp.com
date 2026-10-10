begin;
-- Owner-only personal note storage. Apply before deploying note UI.
-- Personal notes must not be added to books while anonymous public-profile
-- SELECT exposes every books column. Use owner-only storage instead.
create table if not exists public.book_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
alter table public.book_notes enable row level security;
drop policy if exists "Owner only" on public.book_notes;
create policy "Owner only" on public.book_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.book_notes to authenticated;

-- Preserve private legacy notes without replacing newer notes.
insert into public.book_notes(user_id,book_id,notes)
 select user_id,book_id,notes from public.user_books where notes is not null and btrim(notes) <> ''
 on conflict (user_id,book_id) do nothing;
commit;
