begin;
-- Feedback submissions. Insert-only for users (own rows); the owner reads them in Supabase or by email.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('idea','broken','thanks')),
  message text not null check (char_length(message) between 1 and 4000),
  reply_to text,
  user_name text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_user_created_idx on public.feedback (user_id, created_at desc);
alter table public.feedback enable row level security;
drop policy if exists "Insert own feedback" on public.feedback;
create policy "Insert own feedback" on public.feedback for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "Read own feedback" on public.feedback;
create policy "Read own feedback" on public.feedback for select to authenticated
  using (user_id = auth.uid());
grant select, insert on public.feedback to authenticated;
commit;
