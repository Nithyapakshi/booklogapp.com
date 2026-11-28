// Preview: credit signups and book adds to the shared link that brought them, and the reader's country.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript')
const read=p=>fs.readFileSync(p,'utf8')
function load(p,deps={}){const mod={exports:{}};new Function('module','exports','require',ts.transpileModule(read(p),{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(mod,mod.exports,k=>deps[k]||require(k));return mod.exports}
const src=load('lib/signup-source.ts',{'@/lib/usage':{track:()=>{},trackWithCountry:()=>{}}})
const now=Date.parse('2026-11-28T10:00:00Z')
const T='0b6f2f5e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'

test('the first share opened keeps the credit',()=>{
  const first=src.shareFromOpen('book',T,null,null,now)
  assert.deepEqual(first,{k:'book',id:T,t:now,first:true})
  assert.equal(src.shareFromOpen('collection','1b6f2f5e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',first,null,now+1000),null)
})

test('a share after an earlier tagged visit is marked as not first (rule b); the same page load still counts as first',()=>{
  assert.equal(src.shareFromOpen('book',T,null,{t:now-3600e3,s:'google'},now).first,false)
  assert.equal(src.shareFromOpen('book',T,null,{t:now-1000,r:'wa.me'},now).first,true)
})

test('only real share tokens and kinds are kept',()=>{
  for(const [k,t] of [['book','abc'],['profile',T],['book',null],['collection','../x']])assert.equal(src.shareFromOpen(k,t,null,null,now),null)
})

test('stored shares expire after 30 days and bad values count as nothing',()=>{
  const ok=JSON.stringify({k:'collection',id:T,t:now-1000,first:false})
  assert.deepEqual(src.parseShare(ok,now),{k:'collection',id:T,t:now-1000,first:false})
  assert.equal(src.parseShare(JSON.stringify({k:'book',id:T,t:now-31*24*3600e3,first:true}),now),null)
  for(const raw of [null,'','{',JSON.stringify({k:'book',id:'x',t:now})])assert.equal(src.parseShare(raw,now),null)
})

test('the signup event carries the share from this browser, and the source detail is unchanged',()=>{
  assert.deepEqual(src.shareEventDetail({k:'book',id:T,t:now,first:false}),{share_kind:'book',share_id:T,share_first:'no'})
  assert.deepEqual(src.shareEventDetail(null),{})
  assert.deepEqual(src.sourceEventDetail({id:'u',app_metadata:{provider:'email'}},null),{source:'unknown',via:'none',provider:'email'})
  assert.match(read('lib/signup-source.ts'),/trackWithCountry\("account\.source", \{ \.\.\.sourceEventDetail\(user, readStoredSource\(\)\), \.\.\.shareEventDetail\(readStoredShare\(\)\) \}\)/)
})

test('share pages remember the link, record a signed-in view and tag book adds with the link',()=>{
  const book=read('components/shared-book.tsx'),coll=read('components/shared-collection.tsx')
  assert.match(book,/rememberShareOpen\("book",token\)/)
  assert.match(book,/track\("share\.book_viewed",\{share:token\}\)/)
  assert.match(book,/source:"shared_book",shelf,share:token/)
  assert.match(coll,/rememberShareOpen\("collection",token\)/)
  assert.match(coll,/source:"shared_collection",shelf,share:token/)
})

test('country is a two-letter code only, and the event is recorded even when the lookup fails',async()=>{
  const rows=[]
  const usage=load('lib/usage.ts',{'@/lib/supabase/client':{createClientSupabaseClient:()=>({from:()=>({insert:r=>{rows.push(r);return Promise.resolve({})}})})}})
  assert.equal(usage.cleanCountry('ae'),'AE')
  for(const v of ['XX','UAE','',null,'1A','203.0.113.5'])assert.equal(usage.cleanCountry(v),undefined)
  const old=global.window,oldFetch=global.fetch
  global.window={}
  try{
    global.fetch=async()=>({ok:true,json:async()=>({country:'in'})})
    usage.trackWithCountry('app.opened')
    global.fetch=async()=>{throw new Error('offline')}
    usage.trackWithCountry('account.source',{source:'unknown'})
    await new Promise(r=>setTimeout(r,20))
  }finally{global.window=old;global.fetch=oldFetch}
  assert.deepEqual(rows.map(r=>[r.event,r.detail]).sort(),[['account.source',{source:'unknown'}],['app.opened',{country:'IN'}]])
})

test('the country route reads only the country header and keeps no IP',()=>{
  const route=read('app/api/country/route.ts')
  assert.match(route,/x-vercel-ip-country/)
  assert.doesNotMatch(route,/x-forwarded-for|x-real-ip|\.ip\b|insert|console\./)
  assert.match(route,/no-store/)
})

test('privacy notice describes shared-link credit and the country count',()=>{
  const p=read('app/privacy/page.tsx')
  assert.match(p,/which shared link it was/)
  assert.match(p,/For this count we keep only the country, not the IP address/)
})
