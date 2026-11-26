const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs')
const sql=fs.readFileSync('supabase/migrations/20261126_collection_shares.sql','utf8')
test('collection shares migration is additive and changes nothing that exists',()=>{
 assert.doesNotMatch(sql,/\b(drop|alter table public\.books|update public\.|delete from public\.)/i)
 assert.match(sql,/^begin;/m);assert.match(sql,/^commit;/m)
})
test('no direct table access; only the two functions, each with search_path pinned',()=>{
 for(const t of ['collection_shares','collection_share_items']){assert.match(sql,new RegExp(`enable row level security`));assert.match(sql,new RegExp(`revoke all on public.${t} from public, anon, authenticated`))}
 assert.doesNotMatch(sql,/grant (select|insert|update|delete)[^;]* on public\.collection_share/i)
 assert.equal((sql.match(/security definer set search_path = ''/g)||[]).length,2)
 assert.match(sql,/grant execute on function public.create_collection_share\(text\[\], boolean, jsonb\) to authenticated;/)
 assert.match(sql,/grant execute on function public.read_collection_share\(uuid\) to anon, authenticated;/)
})
test('On Hold is never a source; snapshot is copied server-side from the caller\'s own books',()=>{
 assert.doesNotMatch(sql,/'onhold'/i)
 assert.match(sql,/sources <@ array\['recommended','reading','queued','completed'\]/)
 assert.match(sql,/b.user_id = v_uid/);assert.match(sql,/if v_inserted <> v_requested then raise exception/)
 assert.match(sql,/display name in Settings/)
})
test('reader output has no ids, notes, ratings or dates, and drops books removed from the tab',()=>{
 const read=sql.slice(sql.indexOf('create function public.read_collection_share'))
 const cols=read.slice(read.indexOf('returns table'),read.indexOf('language sql'))
 assert.doesNotMatch(cols,/book_id|owner_id|note|rating|started|finished|user_id/)
 assert.match(read,/and exists \(select 1 from public.books b/)
 assert.match(read,/where s.token = p_token/)
})
