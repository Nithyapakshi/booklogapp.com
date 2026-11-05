const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const mod = {exports:{}}
new Function('module','exports',ts.transpileModule(fs.readFileSync('lib/queue-shuffle.ts','utf8'),{compilerOptions:{module:'commonjs'}}).outputText)(mod,mod.exports)
const {pickNext,shouldShowShuffle,SHUFFLE_MIN_QUEUED}=mod.exports
const ids=['a','b','c','d','e']
const empty={current:null,seen:[]}

test('card shows only with 3+ queued books and no next read',()=>{
  assert.equal(SHUFFLE_MIN_QUEUED,3)
  assert.equal(shouldShowShuffle(0,false),false);assert.equal(shouldShowShuffle(2,false),false)
  assert.equal(shouldShowShuffle(3,false),true);assert.equal(shouldShowShuffle(12,false),true)
  assert.equal(shouldShowShuffle(12,true),false)
})
test('no repeats until every queued book has been shown',()=>{
  for (const r of [0,0.5,0.999]) {
    let s=empty;const shown=[]
    for (let i=0;i<ids.length;i++){s=pickNext(ids,s,()=>r);shown.push(s.current)}
    assert.deepEqual([...shown].sort(),ids)
  }
})
test('unlimited shuffles: 100 in a row always show a queued book, never the same one twice running',()=>{
  let s=empty;let prev=null
  for (let i=0;i<100;i++){s=pickNext(ids,s);assert.ok(ids.includes(s.current));assert.notEqual(s.current,prev);prev=s.current;assert.ok(s.seen.length<=ids.length)}
})
test('a new round never repeats the book on screen straight away',()=>{
  let s={current:'e',seen:['a','b','c','d','e']}
  for (const r of [0,0.3,0.999]) assert.notEqual(pickNext(ids,s,()=>r).current,'e')
})
test('books that leave the queue are forgotten; new books join the round',()=>{
  const s=pickNext(['a','b','f'],{current:'c',seen:['a','c']},()=>0)
  assert.ok(['b','f'].includes(s.current));assert.ok(!s.seen.includes('c'))
  assert.deepEqual(pickNext([],{current:'a',seen:['a']}),empty)
})
test('pure: input arrays are not changed',()=>{
  const list=['a','b','c'];const st={current:'a',seen:['a']}
  pickNext(list,st,()=>0.5);assert.deepEqual(list,['a','b','c']);assert.deepEqual(st,{current:'a',seen:['a']})
})
test('card only saves through the existing next-read save and records its use',()=>{
  const ui=fs.readFileSync('components/queue-shuffle.tsx','utf8')
  assert.match(ui,/track\("queue.shuffle_shown"/);assert.match(ui,/track\("queue.shuffled"/)
  assert.doesNotMatch(ui,/createClientSupabaseClient|from\(|moveBook|removeBook/)
  assert.match(ui,/min-h-11/)
  const page=fs.readFileSync('app/books/page.tsx','utf8')
  assert.match(page,/await nextRead.save\(book.id\); track\("queue.shuffle_next_read"/)
  assert.match(page,/!choosingNext && !loading && !loadError && !nextRead.loading && !nextRead.error && shouldShowShuffle\(books.queued.length,!!pinnedNext\)/)
})
