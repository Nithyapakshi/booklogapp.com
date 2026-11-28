-- PREVIEW ONLY (booklog-preview-test). Do NOT run on production: production scheduling needs its own approval.
-- Nightly reset of every active demo library to its sample books, at 23:00 UTC (03:00 Dubai).
-- Books only (see reset_demo in 20261128_demo_accounts.sql): no password, session or account change.
create extension if not exists pg_cron;

create function public.reset_active_demos() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n integer := 0;
begin
  for r in select user_id from public.demo_accounts where active loop
    begin
      perform public.reset_demo(r.user_id);
      n := n + 1;
    exception when others then
      raise warning 'reset_demo failed for a demo account: %', sqlerrm;
    end;
  end loop;
  return n;
end $$;
revoke all on function public.reset_active_demos() from public, anon, authenticated;

select cron.schedule('booklog-demo-nightly-reset', '0 23 * * *', $$select public.reset_active_demos()$$);
