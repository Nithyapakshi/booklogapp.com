-- Additive only: two nullable date columns. Existing rows, policies and functions are untouched.
alter table public.books add column if not exists started_at date;
alter table public.books add column if not exists finished_at date;
