const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(path, deps={}) { const mod={exports:{}}; new Function('module','exports','require',ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(mod,mod.exports,key=>deps[key] || require(key)); return mod.exports }
const isbn=load('lib/isbn.ts')
const google=load('lib/google-books-api.ts')
// scan-isbn keeps a module-level lookup cache, so every test loads a fresh copy to stay independent.
const fresh=()=>load('app/actions/scan-isbn.ts',{'@/lib/isbn':isbn,'@/lib/google-books-api':google}).resolveScannedISBN
const seed={id:'old',title:'Atomic Habits',author:'James Clear',cover:'old',publishedYear:2018}
const item=(id,year,extra={})=>({id,volumeInfo:{title:'Atomic Habits',authors:['James Clear'],language:'en',publishedDate:String(year),imageLinks:{thumbnail:'https://cover/'+id},industryIdentifiers:[{identifier:'9780735211292'}],...extra}})
async function withFetch(fn, task) { const old=global.fetch; global.fetch=fn; try { await task() } finally { global.fetch=old } }
const response=items=>({ok:true,json:async()=>({items})})
test('valid ISBN-10/13 including X, canonical conversion',()=>{assert.equal(isbn.validBookISBN('978-0-7352-1129-2'),'9780735211292');assert.equal(isbn.validBookISBN('0-8044-2957-X'),'080442957X');assert.equal(isbn.isbn13('0735211299'),'9780735211292');assert.ok(isbn.sameISBN('0735211299','9780735211292'))})
test('reject checksum failure, non-book EAN, junk and blank',()=>{for(const v of ['9780735211293','1234567890128','abc','', '9780735211292a'])assert.equal(isbn.validBookISBN(v),null)})
test('same work only, not same title by another author',()=>{const list=isbn.matchingEditions(seed,[seed,{...seed,id:'other',author:'Other Person'},{...seed,id:'different',title:'Atomic Habits Workbook'}]);assert.equal(list.length,1)})
test('edition suffix normalisation preserves work identity',()=>{assert.equal(isbn.matchingEditions(seed,[{...seed,title:'Atomic Habits (Anniversary Edition)'}]).length,1)})
test('invalid ISBN never calls metadata provider',async()=>{await withFetch(()=>{throw Error('must not fetch')},async()=>{assert.equal((await fresh()('123')).ok,false)})})
test('decode exact ISBN then latest matching edition, language and author stay',async()=>{let count=0;await withFetch(async()=>response(++count===1?[item('old',2018)]:[item('new',2025),item('other-author',2026,{authors:['Not James Clear']}),item('translated',2026,{language:'fr'})]),async()=>{const r=await fresh()('9780735211292');assert.equal(r.ok,true);assert.equal(r.book.id,'new');assert.equal(count,2)})})
test('unrelated ISBN response does not count as a match',async()=>{await withFetch(async()=>response([item('wrong',2025,{industryIdentifiers:[{identifier:'9780099458326'}]})]),async()=>assert.equal((await fresh()('9780735211292')).ok,false))})
test('no latest candidate is a clear failure, not silent old edition',async()=>{let n=0;await withFetch(async()=>response(++n===1?[item('old',2018)]:[]),async()=>{const r=await fresh()('9780735211292');assert.equal(r.ok,false);assert.match(r.error,/latest edition/)})})
test('lookup failure cannot auto-save or return invented book',async()=>{await withFetch(async()=>{throw Error('offline')},async()=>{const r=await fresh()('9780735211292');assert.equal(r.ok,false);assert.match(r.error,/unavailable/)})})
test('mobile-only entry, explicit fallback, existing confirmation',()=>{const scan=fs.readFileSync('components/book-barcode-scanner.tsx','utf8');assert.match(scan,/md:hidden/);assert.match(scan,/Enter ISBN instead/);assert.match(scan,/getTracks\(\)\.forEach\(track => track.stop\(\)\)/);assert.match(scan,/visibilitychange/);assert.match(scan,/generation.current/);assert.doesNotMatch(scan,/createBook|localStorage|supabase/);const search=fs.readFileSync('components/book-search.tsx','utf8');assert.match(search,/findInLibrary\(book.id, book.title, book.author\)/);assert.match(search,/latestEditionNotice=\{fromScan\}/)})


const olBook=(title,authors)=>({'ISBN:9780735211292':{title,authors:authors.map(name=>({name})),publish_date:'2018',subjects:[]}})
test('Google has no record: Open Library fallback runs and supplies the book',async()=>{const urls=[];await withFetch(async u=>{urls.push(String(u));return String(u).includes('openlibrary')?{ok:true,json:async()=>olBook('Atomic Habits',['James Clear'])}:response([])},async()=>{const r=await fresh()('9780735211292');assert.equal(r.ok,true);assert.equal(r.book.title,'Atomic Habits');assert.ok(urls.some(u=>u.includes('openlibrary.org')))})})
test('Google and Open Library both have nothing: clear no-match message',async()=>{await withFetch(async u=>String(u).includes('openlibrary')?{ok:true,json:async()=>({})}:response([]),async()=>{const r=await fresh()('9780735211292');assert.equal(r.ok,false);assert.match(r.error,/No match/)})})
