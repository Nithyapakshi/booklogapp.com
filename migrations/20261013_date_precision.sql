-- 20261013_date_precision.sql
-- Month-only reading dates. A month-only date is stored as the first of the month with precision 'month'.
-- Additive: existing rows keep their dates and get precision 'day'. Run on prod BEFORE releasing the code that reads these columns.
alter table public.books add column if not exists started_precision text not null default 'day';
alter table public.books add column if not exists finished_precision text not null default 'day';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'books_started_precision_check') then
    alter table public.books add constraint books_started_precision_check check (started_precision in ('day','month'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'books_finished_precision_check') then
    alter table public.books add constraint books_finished_precision_check check (finished_precision in ('day','month'));
  end if;
end $$;
