-- Test in isolated project before production. Views expose only the intended sharing fields.
begin;
drop policy if exists "Allow public read access to public profiles" on public.profiles;
drop policy if exists "Public can read books for public profiles" on public.books;
drop policy if exists "Allow public read or owner access" on public.user_books;
drop policy if exists "Allow public to read user_books for public profiles" on public.user_books;
drop policy if exists "Public can read recommended books of public profiles" on public.user_books;
create or replace view public.shared_profiles as
select user_id,name,username,profile_visibility,share_mode,avatar_url
from public.profiles where profile_visibility='public';
create or replace view public.shared_books as
select b.id,b.title,b.author,b.cover_url,b.status,b.self_rating,b.user_id
from public.books b join public.profiles p on p.user_id=b.user_id
where p.profile_visibility='public' and (p.share_mode='full_library' or b.status='recommended');
revoke all on public.shared_profiles, public.shared_books from public;
grant select on public.shared_profiles, public.shared_books to anon, authenticated;
commit;
