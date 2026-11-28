-- One-time reader update: recipient list. Read-only. Run in the PRODUCTION SQL editor only after
-- the email_preferences migration is live there and Pakshiraj has approved the send.
-- Export the result as CSV and pass it to send.mjs with --recipients.
-- Only readers who said yes to marketing emails (marketing_opt_in = true) and have not unsubscribed
-- since. A null unsubscribed_at alone is not consent. Excludes unconfirmed accounts. One row per account.
with reading as (
  select distinct on (user_id) user_id, title, author
  from public.books
  where lower(status) = 'reading'
  order by user_id, created_at desc
),
counts as (
  -- Distinct books: a book on both Completed and My Recommendations counts once.
  select user_id, count(distinct id) as book_count from public.books group by user_id
)
select
  u.id as user_id,
  u.email,
  p.name,
  ep.unsubscribe_token as token,
  case when r.user_id is not null then 'A' when coalesce(c.book_count, 0) > 0 then 'B' else 'C' end as version,
  r.title,
  r.author,
  coalesce(c.book_count, 0) as book_count
from auth.users u
join public.email_preferences ep on ep.user_id = u.id
left join lateral (select name from public.profiles where user_id = u.id limit 1) p on true
left join reading r on r.user_id = u.id
left join counts c on c.user_id = u.id
where u.email_confirmed_at is not null
  and ep.marketing_opt_in is true
  and ep.unsubscribed_at is null
  and not exists (select 1 from public.demo_accounts d where d.user_id = u.id)  -- never email demo libraries
order by version, u.created_at;
