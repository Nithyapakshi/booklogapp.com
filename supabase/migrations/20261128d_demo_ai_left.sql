-- demo_ai_left(): how many Ask AI requests today's cap has left for the signed-in DEMO account.
-- PREVIEW FIRST; production only after the owner's explicit go.
-- Additive only: one new read-only function. It never counts or records anything.
-- - A demo account gets 15 minus today's recorded requests (never below 0).
-- - A real reader, a signed-out caller or an unknown user gets null, so it says nothing about real readers.
-- The page uses it only after an Ask AI request fails, to choose the "demo limit reached" wording
-- (production builds hide server error text from the browser).
begin;

create function public.demo_ai_left() returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  used integer;
begin
  if uid is null then return null; end if;
  if not exists (select 1 from public.demo_accounts d where d.user_id = uid) then return null; end if;
  select c.calls into used from public.demo_ai_calls c
   where c.user_id = uid and c.day = (now() at time zone 'utc')::date;
  return greatest(15 - coalesce(used, 0), 0);
end $$;

revoke all on function public.demo_ai_left() from public, anon;
grant execute on function public.demo_ai_left() to authenticated;

commit;
