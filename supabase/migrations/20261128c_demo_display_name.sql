-- Display names for demo accounts (booklogapp.com/demo/<slug>). PREVIEW FIRST; production only after
-- the owner's explicit go.
-- Additive only: one new column and one new function. No existing table, row, policy, function or
-- trigger changes.
--
-- What it does:
-- - demo_accounts.display_name: the organiser-facing name shown in the demo ("Safar"), set by the
--   owner per slug. Null means the demo keeps its generic wording.
-- - demo_display_name(slug): anyone may read the display name of an ACTIVE demo slug, and nothing
--   else. Unknown or inactive slugs return null, so the function cannot be used to probe which
--   slugs exist beyond what the public demo page already shows.

begin;

alter table public.demo_accounts add column if not exists display_name text;

create function public.demo_display_name(p_slug text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  n text;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9-]{1,40}$' then return null; end if;
  select display_name into n from public.demo_accounts where slug = p_slug and active;
  return n;
end $$;

revoke all on function public.demo_display_name(text) from public, anon, authenticated;
grant execute on function public.demo_display_name(text) to anon, authenticated;

commit;
