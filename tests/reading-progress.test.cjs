const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const mod = {exports:{}}
new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/reading-progress.ts','utf8'),{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(mod,mod.exports)
const P = mod.exports
const e = (x) => ({bookId:'b',createdAt:'2026-11-19T10:00:00Z',...x})

test('percent and pages left from a page check-in with a total',()=>{
  const x = e({mode:'page',page:142,totalPages:381})
  assert.equal(P.percentOf(x),37); assert.equal(P.pagesLeft(x),239)
  assert.equal(P.progressSummary(x),'37% · 239 left')
})
test('a page without a total shows the page only, never a made-up percent',()=>{
  const x = e({mode:'page',page:168})
  assert.equal(P.percentOf(x),null); assert.equal(P.pagesLeft(x),null)
  assert.equal(P.progressSummary(x),'Page 168'); assert.equal(P.offerFinish(x),false)
})
test('percent mode works with or without a total (Kindle readers)',()=>{
  assert.equal(P.progressSummary(e({mode:'percent',percent:44})),'44%')
  assert.equal(P.progressSummary(e({mode:'percent',percent:44,totalPages:381})),'44% · 213 left')
  assert.equal(P.percentOf(e({mode:'percent',percent:44.6})),45)
})
test('Finished? is offered from 90%, not before',()=>{
  assert.equal(P.FINISH_OFFER_AT,90)
  assert.equal(P.offerFinish(e({mode:'percent',percent:89})),false)
  assert.equal(P.offerFinish(e({mode:'percent',percent:90})),true)
  assert.equal(P.offerFinish(e({mode:'page',page:350,totalPages:381})),true)
  assert.equal(P.offerFinish(e({mode:'page',page:381,totalPages:381})),true)
  assert.equal(P.offerFinish(undefined),false)
})
test('values are clamped and never negative',()=>{
  assert.equal(P.percentOf(e({mode:'percent',percent:120})),100)
  assert.equal(P.pagesLeft(e({mode:'page',page:400,totalPages:381})),0)
})
test('check-in validation',()=>{
  assert.match(P.checkInError('page','',''),/Enter the page/)
  assert.equal(P.checkInError('page','168',''),null)
  assert.equal(P.checkInError('page','168','381'),null)
  assert.match(P.checkInError('page','400','381'),/past the total/)
  assert.match(P.checkInError('page','12.5',''),/whole page/)
  assert.match(P.checkInError('page','5','0'),/total/)
  assert.equal(P.checkInError('percent','44.5',''),null)
  assert.match(P.checkInError('percent','101',''),/0 to 100/)
  assert.match(P.checkInError('percent','abc',''),/0 to 100/)
})
test('page counts from public data are only used when plausible',()=>{
  assert.equal(P.plausiblePageCount(381),381); assert.equal(P.plausiblePageCount('320'),320)
  for (const bad of [0,5,19,5001,12.5,null,undefined,'x']) assert.equal(P.plausiblePageCount(bad),null)
})
test('the newest check-in per book wins, whatever the order',()=>{
  const rows=[e({bookId:'a',mode:'page',page:10,createdAt:'2026-11-01'}),e({bookId:'a',mode:'page',page:50,createdAt:'2026-11-03'}),e({bookId:'b',mode:'percent',percent:5,createdAt:'2026-11-02'}),e({bookId:'a',mode:'page',page:30,createdAt:'2026-11-02'})]
  const m=P.latestByBook(rows)
  assert.equal(m.get('a').page,50); assert.equal(m.get('b').percent,5); assert.equal(m.size,2)
})
test("What's next? picks the right version",()=>{
  assert.equal(P.whatsNextVariant(true,0),'up_next'); assert.equal(P.whatsNextVariant(true,30),'up_next')
  assert.equal(P.whatsNextVariant(false,3),'shuffle'); assert.equal(P.whatsNextVariant(false,32),'shuffle')
  assert.equal(P.whatsNextVariant(false,2),'choose'); assert.equal(P.whatsNextVariant(false,1),'choose')
  assert.equal(P.whatsNextVariant(false,0),'discover')
})

// Source checks: the feature is limited to the Reading shelf, hides itself when progress cannot be read,
// never writes outside its own table, and the migration is additive.
const comp = fs.readFileSync('components/reading-progress.tsx','utf8')
const page = fs.readFileSync('app/books/page.tsx','utf8')
const sql = fs.readFileSync('supabase/migrations/20261119_reading_progress.sql','utf8')
test('progress line only on the Reading shelf, and hidden when progress cannot be loaded',()=>{
  assert.match(comp,/if \(!ctx\?\.enabled \|\| book\.status !== "reading"\) return null/)
  assert.match(comp,/if \(error\) \{ setEnabled\(false\); return \}/)
})
test('the check-in writes only to reading_progress',()=>{
  const writes=[...comp.matchAll(/\.from\("([a-z_]+)"\)\s*\.(insert|update|upsert|delete)/g)].map(m=>m[1])
  assert.deepEqual([...new Set(writes)],['reading_progress'])
  assert.doesNotMatch(comp,/\.update\(|\.delete\(|\.upsert\(/)
})
test('finishing from the progress line uses the existing move and finish dialog',()=>{
  assert.match(page,/const result = await moveBook\(book, "completed"\)/)
  assert.doesNotMatch(comp,/FinishBookDialog/)
})
test('migration is additive: new table, no change to existing tables or rows',()=>{
  assert.match(sql,/PREVIEW FIRST/)
  assert.doesNotMatch(sql,/alter table public\.(books|next_read|usage_events|profiles)/i)
  assert.doesNotMatch(sql,/(update|insert into) public\.books/i)
  assert.match(sql,/enable row level security/)
  assert.match(sql,/deferrable initially deferred/)
  assert.match(sql,/exception when others/)
})
test('weekly reminder (Release 2) is not part of this release',()=>{
  assert.doesNotMatch(comp,/remind/i)
})
