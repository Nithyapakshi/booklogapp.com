-- Additive migration, no existing rows changed. Apply only after isolated verification.
-- Identity lock serializes this owner's add/edit requests, without exposing other owners.
begin;
create or replace function public.book_identity_text(value text) returns text
language sql immutable strict set search_path=public as $$
 select lower(regexp_replace(btrim(normalize(value,NFC)), '[[:space:]]+', ' ', 'g'))
$$;
create or replace function public.save_book_details(
 p_id text, p_title text, p_author text, p_cover text default '',
 p_edit boolean default false, p_status text default 'queued',
 p_genre text default null, p_description text default null,
 p_year integer default null, p_rating integer default null
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare uid uuid:=auth.uid(); existing public.books%rowtype; result_rows jsonb;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 if nullif(btrim(p_id),'') is null or nullif(btrim(p_title),'') is null or nullif(btrim(p_author),'') is null then raise exception 'Enter a title and author'; end if;
 if length(p_title)>500 or length(p_author)>500 then raise exception 'Title or author too long'; end if;
 if coalesce(p_cover,'')<>'' and (length(p_cover)>2048 or p_cover !~* '^https?://[^[:space:]]+$') then raise exception 'Invalid cover URL'; end if;
 if p_status not in ('reading','queued','completed','recommended','onHold') then raise exception 'Invalid status'; end if;
 if p_rating is not null and (p_rating<0 or p_rating>5) then raise exception 'Invalid rating'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':book-details',0));
 if p_edit and not exists(select 1 from public.books where user_id=uid and id=p_id) then raise exception 'Book not found'; end if;
 select * into existing from public.books where user_id=uid
 and (not p_edit or id<>p_id)
 and (id=p_id or (public.book_identity_text(title)=public.book_identity_text(p_title) and public.book_identity_text(author)=public.book_identity_text(p_author)))
 order by row_id limit 1;
 if existing.row_id is not null then
  select jsonb_agg(to_jsonb(b)) into result_rows from public.books b where user_id=uid and id=existing.id;
  return jsonb_build_object('outcome','duplicate','books',result_rows);
 end if;
 if p_edit then
  update public.books set title=btrim(p_title),author=btrim(p_author),cover_url=coalesce(btrim(p_cover),'') where user_id=uid and id=p_id;
 else
  insert into public.books(id,user_id,title,author,cover_url,status,genre,description,published_year,self_rating,auto_completed)
  values(p_id,uid,btrim(p_title),btrim(p_author),coalesce(btrim(p_cover),''),p_status,p_genre,p_description,p_year,p_rating,false);
  if p_status='recommended' then
   insert into public.books(id,user_id,title,author,cover_url,status,genre,description,published_year,self_rating,auto_completed)
   values(p_id,uid,btrim(p_title),btrim(p_author),coalesce(btrim(p_cover),''),'completed',p_genre,p_description,p_year,p_rating,true);
  end if;
 end if;
 select jsonb_agg(to_jsonb(b)) into result_rows from public.books b where user_id=uid and id=p_id;
 return jsonb_build_object('outcome',case when p_edit then 'edited' else 'added' end,'books',result_rows);
end $$;
revoke all on function public.save_book_details(text,text,text,text,boolean,text,text,text,integer,integer) from public,anon;
grant execute on function public.save_book_details(text,text,text,text,boolean,text,text,text,integer,integer) to authenticated;
commit;
