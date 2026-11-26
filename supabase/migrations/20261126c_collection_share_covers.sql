-- BookLog sharing, Part 2 fix: keep book covers on shared links.
-- Many saved covers are http:// (Google Books). The first version stored those as '' so
-- recipients saw blank covers. This upgrades http:// covers to https:// when a share is made,
-- and when a link is read it falls back to the sender's current cover for items stored blank,
-- which also fixes links already made.
-- Replaces the two functions only. No table, row, policy or grant is changed.
begin;

create or replace function public.create_collection_share(p_sources text[], p_full_library boolean, p_books jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_token uuid;
  v_requested integer;
  v_inserted integer;
  v_available integer;
begin
  if v_uid is null then raise exception 'Log in to share.'; end if;
  select trim(p.name) into v_name from public.profiles p where p.user_id = v_uid;
  if v_name is null or v_name = '' then raise exception 'Add your display name in Settings before sharing.'; end if;
  if p_sources is null or cardinality(p_sources) not between 1 and 4
     or not (p_sources <@ array['recommended','reading','queued','completed']::text[]) then
    raise exception 'Choose what to share.';
  end if;
  if jsonb_typeof(p_books) is distinct from 'array' then raise exception 'Choose at least one book.'; end if;
  v_requested := jsonb_array_length(p_books);
  if v_requested not between 1 and 3000 then raise exception 'Choose at least one book.'; end if;

  insert into public.collection_shares (owner_id, display_name, sources, full_library)
  values (v_uid, left(v_name, 80), p_sources, coalesce(p_full_library, false))
  returning token into v_token;

  insert into public.collection_share_items (token, source, book_id, title, author, cover, sort_order)
  select v_token, lower(b.status), b.id, b.title, left(coalesce(b.author, ''), 500),
         case when b.cover_url like 'https://%' and length(b.cover_url) <= 2000 then b.cover_url
              when b.cover_url like 'http://%' and length(b.cover_url) <= 1999 then 'https://' || substr(b.cover_url, 8)
              else '' end,
         x.ord
  from jsonb_array_elements(p_books) with ordinality as x(item, ord)
  join public.books b
    on b.user_id = v_uid
   and b.id = x.item->>'book_id'
   and lower(b.status) = x.item->>'source'
  where x.item->>'source' = any (p_sources);
  get diagnostics v_inserted = row_count;
  if v_inserted <> v_requested then raise exception 'Some books have changed. Refresh and try again.'; end if;

  if coalesce(p_full_library, false) then
    if not (p_sources @> array['recommended','reading','queued','completed']::text[]) then
      raise exception 'Full library must include Reading, Queued, Completed and Recommendations.';
    end if;
    select count(*) into v_available from public.books b
     where b.user_id = v_uid and lower(b.status) in ('recommended','reading','queued','completed');
    if v_available <> v_inserted then raise exception 'Some books have changed. Refresh and try again.'; end if;
  end if;

  return v_token;
end $$;

create or replace function public.read_collection_share(p_token uuid)
returns table (display_name text, full_library boolean, sources text[], source text, title text, author text, cover text, sort_order integer)
language sql stable security definer set search_path = '' as $$
  select s.display_name, s.full_library, s.sources, i.source, i.title, i.author,
         case when i.token is null then null
              when i.cover <> '' then i.cover
              else coalesce((select case when b.cover_url like 'https://%' and length(b.cover_url) <= 2000 then b.cover_url
                                         when b.cover_url like 'http://%' and length(b.cover_url) <= 1999 then 'https://' || substr(b.cover_url, 8)
                                         else '' end
                               from public.books b
                              where b.user_id = s.owner_id and b.id = i.book_id and lower(b.status) = i.source
                              limit 1), '') end,
         i.sort_order
  from public.collection_shares s
  left join public.collection_share_items i
    on i.token = s.token
   and exists (select 1 from public.books b
                where b.user_id = s.owner_id and b.id = i.book_id and lower(b.status) = i.source)
  where s.token = p_token
  order by i.source, i.sort_order;
$$;

commit;
