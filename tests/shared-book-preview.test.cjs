const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
function load(p,req){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(req,m,m.exports);return m.exports}
const identity=load('lib/book-identity.ts',()=>{})
const snapshot={title:'Synthetic Test Book',author:'Test Author',cover:''}
function harness(results,full=null){let queries=[];const api={searchBooks:async q=>{queries.push(q);return results},getBookById:async()=>full};return {mod:load('lib/shared-book.ts',p=>p.includes('identity')?identity:api),queries}}
test('shared description uses exact same catalog pipeline and never fuzzy title/author',async()=>{
 const h=harness([{...snapshot,id:'test',description:'Exact Add Book text',cover:'http://covers.test/a.jpg'}]);assert.deepEqual(await h.mod.catalogForShare(snapshot),{description:'Exact Add Book text',cover:'https://covers.test/a.jpg'});assert.deepEqual(h.queries,[snapshot.title])
 for(const wrong of [{...snapshot,title:'Synthetic Test Book Two'},{...snapshot,author:'Wrong Author'}]){const h=harness([{...wrong,id:'x',description:'Wrong'}]);assert.deepEqual(await h.mod.catalogForShare(snapshot),{description:'',cover:''})}
})
test('detail enrichment must preserve identity, never returns private fields',async()=>{
 const match={...snapshot,id:'test',description:'Search text',notes:'PRIVATE',selfRating:5};const h=harness([match],{...match,author:'Wrong Author',description:'Wrong'});assert.deepEqual(await h.mod.catalogForShare(snapshot),{description:'Search text',cover:''})
})
test('cover and token validation reject active content, downgrade and malformed tokens',()=>{
 const {mod}=harness([]);for(const v of ['javascript:alert(1)','http://x/a','//x/a','data:image/svg+xml,x'])assert.equal(mod.safeCover(v),'');assert.equal(mod.isShareToken('12345678-1234-4234-9234-123456789abc'),true);assert.equal(mod.isShareToken('../12345678-1234-4234-9234-123456789abc'),false)
})
test('Add Book and public dialog reuse description UI without owned-library dialog',()=>{
 const read=p=>fs.readFileSync(p,'utf8');assert.match(read('components/book-details-dialog.tsx'),/<BookDescription key={book.id} description={book.description}/);assert.match(read('components/shared-book.tsx'),/<BookDescription/);assert.doesNotMatch(read('components/shared-book.tsx'),/BookDetailsDialog|notes|selfRating/);assert.doesNotMatch(read('components/shared-book.tsx'),/New to BookLog|free account|signup.*after signing/)
})
test('preview metadata is server rendered through existing anonymous exact-token RPC only',()=>{
 const server=fs.readFileSync('lib/shared-book-server.ts','utf8'),page=fs.readFileSync('app/s/[token]/page.tsx','utf8');assert.match(server,/createServerSupabaseClient/);assert.match(server,/rpc\("read_book_share"/);assert.doesNotMatch(server,/SERVICE_ROLE_KEY|\.from\(/i);assert.match(page,/generateMetadata/);assert.match(page,/openGraph:/);assert.match(page,/images: book.cover/)
})
test('server catalog key stays at server boundary and missing description retries in browser',()=>{
 const read=p=>fs.readFileSync(p,'utf8');assert.match(read('lib/shared-book-server.ts'),/process.env.GOOGLE_BOOKS_SERVER_KEY \|\| process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY/);assert.doesNotMatch(read('components/shared-book.tsx'),/GOOGLE_BOOKS_SERVER_KEY/);assert.match(read('components/shared-book.tsx'),/if\(!initialBook \|\| initialBook.description\)return/);assert.match(read('lib/google-books-api.ts'),/searchBooksRaw\(query, apiKey\)/)
})
test('catalog uses same supplied credential for search and exact detail enrichment',async()=>{
 const seen=[];const match={...snapshot,id:'synthetic',description:'Same text'};const api={searchBooks:async(q,key)=>{seen.push(key);return[match]},getBookById:async(id,key)=>{seen.push(key);return match}};const mod=load('lib/shared-book.ts',p=>p.includes('identity')?identity:api);await mod.catalogForShare(snapshot,'synthetic-server-value');assert.deepEqual(seen,['synthetic-server-value','synthetic-server-value'])
})
test('code UUID round trips losslessly; canonical spare bits, padding, malformed input rejected',()=>{
 const h=load('lib/public-share-path.ts',()=>{}),crypto=require('crypto');
 for(let i=0;i<500;i++){const token=crypto.randomUUID(),code=h.shareCode(token);assert.equal(code.length,22);assert.equal(h.tokenFromShareCode(code),token);assert.equal(h.shareCode(token.toUpperCase()),code)}
 const token='12345678-1234-4234-9234-123456789abc',code=h.shareCode(token),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',last=alphabet.indexOf(code.at(-1));
 for(let bits=1;bits<16;bits++)assert.equal(h.tokenFromShareCode(code.slice(0,-1)+alphabet[last+bits]),null)
 for(const bad of ['',code+'=',code+'==',code.slice(1),code+'A','!'.repeat(22),code+'\n','../'+code])assert.equal(h.tokenFromShareCode(bad),null)
 assert.throws(()=>h.shareCode('not-a-uuid'))
})
test('coded save allowlist is exact, anchored and rejects redirects, query tricks and wrong first segments',()=>{
 const h=load('lib/public-share-path.ts',()=>{}),auth=load('lib/auth-return.ts',()=>h),code=h.shareCode('12345678-1234-4234-9234-123456789abc'),good='/synthetic-book/'+code+'?save=1';assert.equal(auth.safeAuthReturn(good),good)
 for(const bad of ['//evil.test'+good,'https://evil.test'+good,good+'&x=1',good+'#x',good+'\n',good+'\r\n',good.replace('?save=1','?save=0'),good.replace('synthetic-book','Synthetic-book'),good.replace('synthetic-book','books'),good.replace('synthetic-book','auth-debug'),good.replace('synthetic-book','%73ynthetic-book'),good.replace('?save=1','/?save=1'),good.replace(code,code+'='),'/synthetic-book?by=reader-a&save=1'])assert.equal(auth.safeAuthReturn(bad),'/books',bad)
})
test('every static app directory is outside coded slug, default route verifies resolved snapshot title',()=>{
 const h=load('lib/public-share-path.ts',()=>{}),code=h.shareCode('12345678-1234-4234-9234-123456789abc');
 for(const item of fs.readdirSync('app',{withFileTypes:true})){if(!item.isDirectory()||item.name.startsWith('['))continue;assert.notEqual(h.publicBookSlug(item.name),item.name);assert.equal(h.parseCodedSave(`/${item.name}/${code}?save=1`),null)}
 const s=fs.readFileSync('app/[bookSlug]/[shareCode]/page.tsx','utf8');assert.match(s,/publicBookSlug\(book.title\)===slug/);assert.match(s,/if\(!item\)notFound\(\)/)
})
test('coded flow uses existing RPC only, no username schema; save locks before fresh token check',()=>{
 const s=fs.readFileSync('components/shared-book.tsx','utf8'),save=s.slice(s.indexOf('async function save'));
 assert.ok(save.indexOf('saveLock.current=true')<save.indexOf('rpc("read_book_share"'));assert.match(save,/finally\{saveLock.current=false;setBusy\(false\)\}/);assert.match(save,/if\(error\|\|!data\?\.\[0\]\)/);assert.match(save,/if\(!sameBook\(book,data\[0\]\)\)/)
 for(const file of ['components/book-share-controls.tsx','components/shared-book-context.tsx','components/shared-book.tsx','lib/shared-book-server.ts'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/publish_book_share|read_published_book_share|book_share_handles/)
 assert.match(fs.readFileSync('components/book-share-controls.tsx','utf8'),/codedSharePath\(book.title,data.token\)/)
})
test('link previews answer from the stored snapshot; Google is only a capped, cached cover fallback',()=>{
 const s=fs.readFileSync('lib/shared-book-server.ts','utf8')
 assert.match(s,/if \(snapshot\.cover\) return snapshot/)
 assert.match(s,/COVER_LOOKUP_MS = 2500/);assert.match(s,/unstable_cache\(/);assert.match(s,/revalidate: 86400/)
 assert.match(s,/throw new EmptyCatalog\(\)/,'empty or failed lookups must not be cached')
 assert.doesNotMatch(s,/resolve\(\{description:"",cover:snapshot.cover\}\), 5000/)
})
test('In your library links to the exact shelf position; ?book= dialog links are unchanged',()=>{
 const shared=fs.readFileSync('components/shared-book.tsx','utf8'),page=fs.readFileSync('app/books/page.tsx','utf8')
 assert.match(shared,/href=\{`\/books\?show=\$\{encodeURIComponent\(libraryId\)\}`\}/);assert.match(shared,/setLibraryId\(existing\.id\)/)
 assert.match(page,/get\("show"\)/);assert.match(page,/Math\.floor\(index \/ pageSize\) \+ 1/);assert.match(page,/CSS\.escape\(locateId\)/)
 assert.ok(page.indexOf('setCurrentPage(Math.floor(index')>page.indexOf('useEffect(() => { setCurrentPage(1) }'),'located page must be set after the tab-change reset')
 assert.match(page,/const requestedBookId = searchParams\.get\("book"\)/)
 for(const f of ['components/book-card.tsx','components/next-read-controls.tsx'])assert.match(fs.readFileSync(f,'utf8'),/data-book-id=\{book\.id\}/)
 assert.match(page,/data-book-id=\{book\.id\}/)
})
test('share pages are saved copies, read errors are never cached, new links are warmed at creation',()=>{
 for(const p of ['app/s/[token]/page.tsx','app/[bookSlug]/[shareCode]/page.tsx']){const s=fs.readFileSync(p,'utf8');assert.match(s,/export const revalidate = 86400/);assert.match(s,/export async function generateStaticParams\(\) \{ return \[\] \}/);assert.doesNotMatch(s,/cookies\(|headers\(/)}
 const server=fs.readFileSync('lib/shared-book-server.ts','utf8');assert.match(server,/if \(error\) throw new Error/);assert.doesNotMatch(server,/catch \{ return null \}\n\}\)/)
 assert.match(fs.readFileSync('components/book-share-controls.tsx','utf8'),/void fetch\(url,\{credentials:"omit"\}\)\.catch/)
})
