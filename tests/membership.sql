-- Isolated test backend, synthetic fixtures only.
begin;
insert into books(id,user_id,title,author,status,self_rating) values('membership-test','11111111-1111-4111-8111-111111111111','Synthetic membership','Test','completed',4);
insert into book_notes(user_id,book_id,notes) values('11111111-1111-4111-8111-111111111111','membership-test','Keep');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select status from book_membership('membership-test','recommended');
select status from book_membership('membership-test','queued');
do $$ begin if not exists(select 1 from books where id='membership-test' and status='completed' and not auto_completed) or exists(select 1 from books where id='membership-test' and status='recommended') then raise exception 'Manual completed membership lost'; end if; end $$;
select status from book_membership('membership-test','recommended');
select status from book_membership('membership-test','recommended',true);
do $$ begin if exists(select 1 from books where id='membership-test' and status='recommended') or not exists(select 1 from books where id='membership-test' and status='completed') then raise exception 'Recommendation removal failed'; end if; end $$;
do $$ begin begin perform book_membership('membership-test','invalid'); raise exception 'Invalid membership accepted'; exception when others then if SQLERRM='Invalid membership accepted' then raise; end if; end; end $$;
set constraints cleanup_book_note immediate;
do $$ begin if not exists(select 1 from book_notes where book_id='membership-test') then raise exception 'Membership transitions lost note'; end if; end $$;
rollback;
