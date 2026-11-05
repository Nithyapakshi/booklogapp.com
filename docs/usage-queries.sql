-- BookLog usage: saved queries. Run in the Supabase SQL editor (owner access; readers cannot read usage_events).
-- Data changes come from database triggers (source = 'db'); other actions from the app (source = 'app').

-- 1. Daily and weekly active readers (from app.opened, once per reader per day)
select date_trunc('day', created_at)::date as day, count(distinct user_id) as readers
from usage_events where event = 'app.opened' group by 1 order by 1 desc limit 30;

select date_trunc('week', created_at)::date as week, count(distinct user_id) as readers
from usage_events where event = 'app.opened' group by 1 order by 1 desc limit 12;

-- 2. Every action: readers and times used, last 30 days
select event, count(distinct user_id) as readers, count(*) as times
from usage_events where created_at > now() - interval '30 days'
group by 1 order by readers desc, times desc;

-- 3. Book actions (added / moved / removed), built from shelf changes in one transaction
select action, count(distinct user_id) as readers, count(*) as times
from usage_book_actions where created_at > now() - interval '30 days' group by 1;

-- 4. Where books are added from (search, barcode, discover, starter_title, manual, shared_book)
select detail->>'source' as source, count(distinct user_id) as readers, count(*) as books
from usage_events where event = 'book.added_from' and created_at > now() - interval '30 days' group by 1 order by books desc;

-- 5. Adoption: share of active readers (last 30 days) who used each feature at least once
with active as (select distinct user_id from usage_events where event = 'app.opened' and created_at > now() - interval '30 days')
select e.event, round(100.0 * count(distinct e.user_id) / nullif((select count(*) from active), 0), 1) as pct_of_active
from usage_events e join active a using (user_id)
where e.created_at > now() - interval '30 days' group by 1 order by 2 desc;

-- 6. Goodreads import funnel
select event, count(distinct user_id) as readers, sum(coalesce((detail->>'imported')::int, 0)) as books_imported
from usage_events where event like 'import.goodreads_%' or event = 'link.empty_shelf_goodreads' or event = 'stats.import_clicked'
group by 1 order by 1;

-- 7. First-time use of each feature by day (new adopters)
select first_day, event, count(*) as new_readers from (
  select user_id, event, min(created_at)::date as first_day from usage_events group by 1, 2
) f group by 1, 2 order by 1 desc, 3 desc limit 100;

-- 8. Queue shuffle: card seen, shuffles, next reads set from the card, and whether those books were started
select
  count(distinct user_id) filter (where event = 'queue.shuffle_shown') as readers_saw_card,
  count(distinct user_id) filter (where event = 'queue.shuffled') as readers_shuffled,
  count(*) filter (where event = 'queue.shuffled') as shuffles,
  count(distinct user_id) filter (where event = 'queue.shuffle_next_read') as readers_set_next_read,
  count(*) filter (where event = 'queue.shuffle_next_read') as next_reads_set
from usage_events where event like 'queue.shuffle%' and created_at > now() - interval '30 days';

select count(*) as picked, count(*) filter (where b.status = 'reading' or b.status = 'completed') as started
from usage_events e
left join books b on b.user_id = e.user_id and b.id = e.book_id
where e.event = 'queue.shuffle_next_read' and e.created_at > now() - interval '30 days';
