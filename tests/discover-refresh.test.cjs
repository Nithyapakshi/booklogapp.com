const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(path) {
  const mod = { exports: {} }
  new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(mod, mod.exports)
  return mod.exports
}
const {mergeRefreshCandidates,refreshStatus} = load('lib/discover-refresh.ts')
const {buildRowSpecs,assembleRows}=load('lib/discover-rows.ts')
const p=fs.readFileSync('app/books/page.tsx','utf8')
const candidates=(n,prefix)=>Array.from({length:n},(_,i)=>({id:`${prefix}-${i}`,title:`${prefix} ${i}`,author:`Writer ${i}`,cover:'https://example.com/cover.jpg'}))

test('a timeout is slow loading, not a completed empty result or retryable error',()=>{
  assert.equal(refreshStatus(true,false,false),'loading')
  assert.equal(refreshStatus(true,true,false),'slow')
  assert.equal(refreshStatus(true,true,true),'slow')
  assert.equal(refreshStatus(false,true,true),'failed')
  assert.match(p,/!hasAnything && !isLoading && !rowsLoading && !rowsFailed && specs.length > 0/)
  assert.doesNotMatch(p,/\(!rowsLoading \|\| rowsTimedOut\)/)
})
test('stale same-owner rows remain during refresh; empty incremental fetch cannot erase them',()=>{
  assert.match(p,/if \(saved\?\.candidates\) setCandidates\(saved.candidates\)/)
  assert.match(p,/if \(!cancelled && list.length\) setCandidates/)
  assert.doesNotMatch(p,/setRowsLoading\(true\); setRowsTimedOut\(false\); setCandidates\(\{\}\)/)
})
test('partial failure keeps only failed keys; successful empty result clears old candidates',()=>{
 const old={a:candidates(5,'old'),b:candidates(5,'b'),deleted:candidates(5,'deleted')}
 const got={a:[],b:[]}
 const merged=mergeRefreshCandidates(['a','b'],old,got,['a'])
 assert.deepEqual(merged,{a:old.a,b:[]})
 assert.deepEqual(mergeRefreshCandidates(['a'],{},got,['a']),{a:[]})
})
test('cache failures do not overwrite the previous working cache; account change clears rows',()=>{
 assert.match(p,/if \(!partial && Object.values\(got\)/)
 assert.match(p,/rowsOwnerRef.current !== rowsCacheKey/)
 assert.match(p,/rowsOwnerRef.current = rowsCacheKey\s+setCandidates\(\{\}\)/)
 assert.match(p,/catch \{ if \(!cancelled\) setRowsFailed\(true\) \}/)
 assert.match(p,/onClick=\{\(\) => setRowsRetry\(n => n \+ 1\)\}/)
 assert.match(p,/if \(!rowsRetry && saved/)
})
test('52-book owner-library shape still assembles prior eligible rows through a forced outage',()=>{
 // No private owner library enters the repository: this shape matches observed
 // count/eligibility, with synthetic titles and writers. Exact owner replay is local.
 const library=Array.from({length:52},(_,i)=>({id:`owned${i}`,title:`Owned ${i}`,author:`Author ${i}`,genre:i<40?'Fiction':'Business',status:'completed',selfRating:i<8?5:undefined}))
 const specs=buildRowSpecs(library), keys=specs.map(s=>s.key)
 const old=Object.fromEntries(specs.map((s,i)=>[s.key,candidates(15,`pool${i}`)]))
 const before=assembleRows(specs,old,library,[])
 const merged=mergeRefreshCandidates(keys,old,{},keys)
 assert.deepEqual(assembleRows(specs,merged,library,[]),before)
 assert.ok(before.length>0)
})
test('real catalog fetch forced 503 + fallback outage returns failed keys (no wall-clock sleeps)',async()=>{
 const src=fs.readFileSync('app/actions/discover-rows.ts','utf8')
 const mod={exports:{}};let google=0,fallback=0
 const fakeFetch=async url=>{if(String(url).includes('googleapis'))google++;else fallback++;return {ok:false,status:503}}
 new Function('module','exports','fetch','setTimeout',ts.transpileModule(src,{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(mod,mod.exports,fakeFetch,fn=>{fn();return 0})
 const result=await mod.exports.fetchDiscoverCandidates([{key:'genre:Fiction',kind:'genre',genre:'Fiction'}])
 assert.deepEqual(result.failed,['genre:Fiction']);assert.deepEqual(result.candidates,{'genre:Fiction':[]})
 assert.ok(google>0&&fallback>0)
 assert.equal(refreshStatus(false,true,result.failed.length>0),'failed')
})
