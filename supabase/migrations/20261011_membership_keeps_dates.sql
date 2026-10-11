-- Replaces book_membership so moving a book to or from Recommendations keeps its start and finish days.
-- Transactional multi-row membership transitions. Invoker security plus RLS.
create or replace function public.book_membership(p_book_id text,p_status text,p_remove boolean default false)
returns setof public.books language plpgsql security invoker set search_path=public as $$
declare source public.books%rowtype; uid uuid:=auth.uid(); st date; fi date;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if p_status not in ('reading','queued','completed','recommended','onHold') then raise exception 'Invalid status'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_book_id,0));
 select * into source from public.books where user_id=uid and id=p_book_id
 order by case when status='recommended' then 0 when status='completed' then 1 else 2 end limit 1 for update;
 if source.row_id is null then raise exception 'Book not found'; end if;
 -- Carry the reader's start and finish days to any row this function creates.
 select min(started_at),max(finished_at) into st,fi from public.books where user_id=uid and id=p_book_id;
 if p_remove then
  if p_status='recommended' then
   if not exists(select 1 from public.books where user_id=uid and id=p_book_id and status='completed') then
    insert into public.books(id,user_id,title,author,status,cover_url,description,published_year,self_rating,genre,auto_completed,started_at,finished_at)
    values(source.id,uid,source.title,source.author,'completed',source.cover_url,source.description,source.published_year,source.self_rating,source.genre,true,st,fi);
   end if;
   delete from public.books where user_id=uid and id=p_book_id and status='recommended';
  else delete from public.books where user_id=uid and id=p_book_id;
  end if;
 elsif p_status='recommended' then
  if not exists(select 1 from public.books where user_id=uid and id=p_book_id and status='completed') then
   insert into public.books(id,user_id,title,author,status,cover_url,description,published_year,self_rating,genre,auto_completed,started_at,finished_at)
   values(source.id,uid,source.title,source.author,'completed',source.cover_url,source.description,source.published_year,source.self_rating,source.genre,true,st,fi);
  end if;
  delete from public.books where user_id=uid and id=p_book_id and status not in ('completed','recommended');
  if not exists(select 1 from public.books where user_id=uid and id=p_book_id and status='recommended') then
   insert into public.books(id,user_id,title,author,status,cover_url,description,published_year,self_rating,genre,auto_completed,started_at,finished_at)
   values(source.id,uid,source.title,source.author,'recommended',source.cover_url,source.description,source.published_year,source.self_rating,source.genre,false,st,fi);
  end if;
 else
  -- Keep a deliberately completed copy when moving recommendations elsewhere.
  delete from public.books where user_id=uid and id=p_book_id and status='recommended';
  delete from public.books where user_id=uid and id=p_book_id and status='completed' and auto_completed=true;
  if not exists(select 1 from public.books where user_id=uid and id=p_book_id and status=p_status) then
   insert into public.books(id,user_id,title,author,status,cover_url,description,published_year,self_rating,genre,auto_completed,started_at,finished_at)
   values(source.id,uid,source.title,source.author,p_status,source.cover_url,source.description,source.published_year,source.self_rating,source.genre,false,st,fi);
  end if;
 end if;
 return query select * from public.books where user_id=uid and id=p_book_id;
end; $$;
revoke all on function public.book_membership(text,text,boolean) from public, anon;
grant execute on function public.book_membership(text,text,boolean) to authenticated;
