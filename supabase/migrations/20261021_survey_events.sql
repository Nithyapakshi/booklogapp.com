-- First-run survey answers. One row per survey interaction: who it was, what happened
-- (completed, skipped, or closed via the X), their answers when completed (up to 3 genres,
-- one mood, optional favorite author), and when. New table only; no changes to existing tables.
-- Idempotent: safe to run again (if not exists / drop ... if exists first).

create table if not exists public.survey_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('completed', 'skipped', 'closed_x')),
  genres text[],          -- up to 3, only set when event_type = 'completed'
  mood text,              -- only set when completed
  favorite_author text,   -- optional, only set when completed
  created_at timestamptz not null default now()
);

-- Value guardrails matching the dialog: at most 3 genres, mood from the known list, author capped.
alter table public.survey_events drop constraint if exists survey_events_genres_max_3;
alter table public.survey_events add constraint survey_events_genres_max_3
  check (coalesce(array_length(genres, 1), 0) <= 3);

alter table public.survey_events drop constraint if exists survey_events_mood_known;
alter table public.survey_events add constraint survey_events_mood_known
  check (mood is null or mood in ('A page-turner', 'Something slow & rich', 'To learn something', 'To feel seen', 'To escape'));

alter table public.survey_events drop constraint if exists survey_events_author_length;
alter table public.survey_events add constraint survey_events_author_length
  check (favorite_author is null or char_length(favorite_author) <= 120);

create index if not exists survey_events_user_created_idx
  on public.survey_events (user_id, created_at desc);

alter table public.survey_events enable row level security;

drop policy if exists "users insert their own survey events" on public.survey_events;
create policy "users insert their own survey events"
  on public.survey_events for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users read their own survey events" on public.survey_events;
create policy "users read their own survey events"
  on public.survey_events for select to authenticated
  using (auth.uid() = user_id);
