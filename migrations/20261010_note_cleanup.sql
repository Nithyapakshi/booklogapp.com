-- Deferred cleanup checks final transaction state, preserving notes during moves.
begin;
create or replace function public.cleanup_book_note() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if not exists(select 1 from public.books where user_id=old.user_id and id=old.id) then
  delete from public.book_notes where user_id=old.user_id and book_id=old.id;
 end if;
 return null;
end; $$;
drop trigger if exists cleanup_book_note on public.books;
create constraint trigger cleanup_book_note after delete on public.books
 deferrable initially deferred for each row execute function public.cleanup_book_note();
commit;
