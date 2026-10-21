-- First-run survey answers. One row per survey interaction: who it was, what happened
-- (completed, skipped, or closed via the X), their answers when completed (up to 3 genres,
-- one mood, optional favorite author), and when. New table only; no changes to existing tables.
create table public.survey_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('completed', 'skipped', 'closed_x')),
  genres text[],          -- up to 3, only set when event_type = 'completed'
  mood text,              -- only set when completed
  favorite_author text,   -- optional, only set when completed
  created_at timestamptz not null default now()
);

create index survey_events_user_created_idx
  on public.survey_events (user_id, created_at desc);

alter table public.survey_events enable row level security;

create policy "users insert their own survey events"
  on public.survey_events for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users read their own survey events"
  on public.survey_events for select to authenticated
  using (auth.uid() = user_id);
