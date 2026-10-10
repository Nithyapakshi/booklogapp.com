-- Isolated synthetic backend only. No customer fixtures.
begin;
insert into books(id,user_id,title,author,status) values
 ('cleanup-test','11111111-1111-4111-8111-111111111111','Cleanup synthetic','Test','completed'),
 ('cleanup-test','11111111-1111-4111-8111-111111111111','Cleanup synthetic','Test','recommended');
insert into book_notes(user_id,book_id,notes) values('11111111-1111-4111-8111-111111111111','cleanup-test','Keep until final membership gone');
delete from books where id='cleanup-test' and status='recommended';
set constraints cleanup_book_note immediate;
do $$ begin if not exists(select 1 from book_notes where book_id='cleanup-test') then raise exception 'Note lost on partial deletion'; end if; end $$;
set constraints cleanup_book_note deferred;
delete from books where id='cleanup-test';
insert into books(id,user_id,title,author,status) values('cleanup-test','11111111-1111-4111-8111-111111111111','Cleanup synthetic','Test','queued');
set constraints cleanup_book_note immediate;
do $$ begin if not exists(select 1 from book_notes where book_id='cleanup-test') then raise exception 'Note lost during transactional move'; end if; end $$;
delete from books where id='cleanup-test';
do $$ begin if exists(select 1 from book_notes where book_id='cleanup-test') then raise exception 'Note orphaned after final deletion'; end if; end $$;
rollback;
