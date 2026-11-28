-- Demo library template: 16 sample books (19 shelf rows: 3 Completed books are also on My Recommendations).
-- Run once per database after 20261128_demo_accounts.sql (preview first). Re-running replaces the template.
-- Ids are fixed UUIDs derived from the title, so every demo account uses the same ids.
-- Covers, descriptions and years start blank: the app fills them on first open (fill-only), and
-- reset_demo copies what was filled back into this template, so later resets keep the covers.
begin;
delete from public.demo_seed_books;
insert into public.demo_seed_books
  (position, id, title, author, status, self_rating, started_days_ago, finished_days_ago, progress_percent, is_next, note, genre)
select position, md5('booklog-demo:' || title)::uuid::text, title, author, status, self_rating,
  started_days_ago, finished_days_ago, progress_percent, is_next, note, genre
from (values
  ( 1, 'Tomorrow, and Tomorrow, and Tomorrow', 'Gabrielle Zevin', 'reading', null::numeric, 20, null::int, 45::numeric, false, null::text, 'Fiction'),
  ( 2, 'Atomic Habits', 'James Clear', 'reading', null, 10, null, 30, false, null, 'Self-help'),
  ( 3, 'Project Hail Mary', 'Andy Weir', 'queued', null, null, null, null, true, null, 'Science fiction'),
  ( 4, 'The Covenant of Water', 'Abraham Verghese', 'queued', null, null, null, null, false, null, 'Historical fiction'),
  ( 5, 'Sapiens', 'Yuval Noah Harari', 'queued', null, null, null, null, false, null, 'History'),
  ( 6, 'The Seven Husbands of Evelyn Hugo', 'Taylor Jenkins Reid', 'queued', null, null, null, null, false, null, 'Fiction'),
  ( 7, 'The Kite Runner', 'Khaled Hosseini', 'completed', 5, 50, 30, null, false, 'Read it in two sittings. The kite chapters stayed with me for days.', 'Fiction'),
  ( 8, 'Educated', 'Tara Westover', 'completed', 5, 75, 60, null, false, 'Hard to believe it is a memoir. Great one to discuss with friends.', 'Memoir'),
  ( 9, 'A Man Called Ove', 'Fredrik Backman', 'completed', 5, 100, 90, null, false, 'Funny and sad at once. Gave a copy to my neighbour.', 'Fiction'),
  (10, 'Lessons in Chemistry', 'Bonnie Garmus', 'completed', 4, 60, 45, null, false, null, 'Fiction'),
  (11, 'The Silent Patient', 'Alex Michaelides', 'completed', 3, 85, 75, null, false, null, 'Thriller'),
  (12, 'Where the Crawdads Sing', 'Delia Owens', 'completed', 4, 135, 120, null, false, null, 'Fiction'),
  (13, 'The Midnight Library', 'Matt Haig', 'completed', 4, 160, 150, null, false, null, 'Fiction'),
  (14, 'The Alchemist', 'Paulo Coelho', 'completed', 3, 210, 200, null, false, null, 'Fiction'),
  (15, 'The Kite Runner', 'Khaled Hosseini', 'recommended', 5, 50, 30, null, false, null, 'Fiction'),
  (16, 'Educated', 'Tara Westover', 'recommended', 5, 75, 60, null, false, null, 'Memoir'),
  (17, 'A Man Called Ove', 'Fredrik Backman', 'recommended', 5, 100, 90, null, false, null, 'Fiction'),
  (18, 'The Brothers Karamazov', 'Fyodor Dostoevsky', 'onHold', null, 100, null, null, false, null, 'Classics'),
  (19, 'The Thursday Murder Club', 'Richard Osman', 'queued', null, null, null, null, false, null, 'Mystery')
) as v(position, title, author, status, self_rating, started_days_ago, finished_days_ago, progress_percent, is_next, note, genre);
commit;

-- To make an existing account a demo (once per organiser; needs the user_id only, never the password):
--   insert into public.demo_accounts (user_id, slug) values ('<user_id>', 'safar');
--   select public.reset_demo('<user_id>');
-- Switch a demo off (link stops at once):
--   update public.demo_accounts set active = false where slug = 'safar';
-- and, to end visitor sessions already open, ban the auth user and delete its sessions (owner only).
