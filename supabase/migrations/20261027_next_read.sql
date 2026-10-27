-- PREVIEW FIRST. New private intent table only; no existing rows changed.
-- Do not run on production until the owner approves the tested release.
begin;
create table public.next_read (
  user_id uuid primary key references auth.users(id) on delete cascade,
  book_id text not null check (length(book_id) between 1 and 500)
);
alter table public.next_read enable row level security;
revoke all on public.next_read from public, anon, authenticated;
grant select, insert, update, delete on public.next_read to authenticated;
create policy next_read_owner on public.next_read for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Validate even direct API writes. Lock the membership while the intent is saved,
-- so a concurrent move/delete cannot leave an invalid intent behind.
create function public.validate_next_read() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.books where user_id = new.user_id and id = new.book_id and status = 'queued' for update;
  if not found then raise exception 'Choose a book from your Queued list'; end if;
  return new;
end $$;
create trigger validate_next_read before insert or update on public.next_read
  for each row execute function public.validate_next_read();
-- Existing move/delete paths clear intent in the same transaction, including
-- actions from book details, grid/list menus and other devices.
create function public.clear_departed_next_read() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.books where user_id = old.user_id and id = old.id and status = 'queued') then
    delete from public.next_read where user_id = old.user_id and book_id = old.id;
  end if;
  return null;
end $$;
create trigger clear_departed_next_read after delete or update of status, id, user_id on public.books
  for each row execute function public.clear_departed_next_read();
revoke all on function public.validate_next_read() from public, anon, authenticated;
revoke all on function public.clear_departed_next_read() from public, anon, authenticated;
commit;
