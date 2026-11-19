-- PREVIEW FIRST. Reading progress check-in.
-- New private table only. No existing table, column or row is changed.
-- Do not run on production until the owner approves the tested release.
begin;

-- One row per check-in, so progress across distinct days can be counted.
-- The card shows the newest row for the book.
create table public.reading_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  book_id text not null check (length(book_id) between 1 and 500),
  mode text not null check (mode in ('page', 'percent')),
  page integer check (page between 0 and 20000),
  percent numeric(5,2) check (percent between 0 and 100),
  total_pages integer check (total_pages between 1 and 20000),
  created_at timestamptz not null default now(),
  check ((mode = 'page' and page is not null) or (mode = 'percent' and percent is not null)),
  check (page is null or total_pages is null or page <= total_pages)
);
create index reading_progress_user_book on public.reading_progress (user_id, book_id, created_at desc);

-- Readers add and read only their own check-ins. No edits; each check-in is a new row.
alter table public.reading_progress enable row level security;
revoke all on public.reading_progress from public, anon, authenticated;
grant select on public.reading_progress to authenticated;
grant insert (book_id, mode, page, percent, total_pages) on public.reading_progress to authenticated;
create policy reading_progress_read_own on public.reading_progress for select to authenticated
  using (user_id = auth.uid());
create policy reading_progress_add_own on public.reading_progress for insert to authenticated
  with check (user_id = auth.uid());

-- Validate even direct API writes: the book must be on the reader's Reading shelf.
create function public.validate_reading_progress() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.books where user_id = new.user_id and id = new.book_id and lower(status) = 'reading';
  if not found then raise exception 'Progress can only be saved for a book you are reading'; end if;
  return new;
end $$;
create trigger validate_reading_progress before insert on public.reading_progress
  for each row execute function public.validate_reading_progress();

-- Progress belongs to the current read. When a book ends up on neither Reading nor On Hold
-- (finished, queued again, recommended or removed), its check-ins are cleared, so a re-read starts fresh.
-- Checked at commit, because some moves delete one shelf row and insert another in one transaction.
-- Never blocks the move: any error here is swallowed.
create function public.clear_finished_reading_progress() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if not exists (select 1 from public.books where user_id = old.user_id and id = old.id and lower(status) in ('reading', 'onhold')) then
      delete from public.reading_progress where user_id = old.user_id and book_id = old.id;
    end if;
  exception when others then
    null;
  end;
  return null;
end $$;
create constraint trigger clear_finished_reading_progress after delete or update of status, id, user_id on public.books
  deferrable initially deferred
  for each row when (lower(old.status) = 'reading' or lower(old.status) = 'onhold')
  execute function public.clear_finished_reading_progress();

-- Usage: every check-in is recorded as progress.updated (mode, and whether it is the first for this read).
create function public.usage_reading_progress() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.usage_record(new.user_id, 'progress.updated', new.book_id,
    jsonb_build_object('mode', new.mode,
      'first', not exists (select 1 from public.reading_progress where user_id = new.user_id and book_id = new.book_id and id <> new.id)));
  return null;
exception when others then
  return null;
end $$;
create trigger zz_usage_reading_progress after insert on public.reading_progress
  for each row execute function public.usage_reading_progress();

revoke all on function public.validate_reading_progress() from public, anon, authenticated;
revoke all on function public.clear_finished_reading_progress() from public, anon, authenticated;
revoke all on function public.usage_reading_progress() from public, anon, authenticated;
commit;
