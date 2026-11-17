const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs')
const load=()=>import('../scripts/reader-update/render.mjs')
const loadSend=()=>import('../scripts/reader-update/send.mjs')
const token='12345678-1234-4234-9234-123456789abc'
const BANNED=/—|I'm|I am Pakshiraj|spare time|leverage|seamless|delve|journey|passionate|Since you last visited|readers often start/

test('first names: clean ones greet, junk falls back to Hello,',async()=>{
 const {cleanFirstName}=await load()
 assert.equal(cleanFirstName('Pakshiraj Ananthan'),'Pakshiraj')
 assert.equal(cleanFirstName('maria lopez'),'Maria')
 assert.equal(cleanFirstName("O'Neil"),"O'Neil")
 assert.equal(cleanFirstName('Zoë'),'Zoë')
 for(const bad of ['',null,'a','user','Test','john123','j.doe@x.com','  '])assert.equal(cleanFirstName(bad),'',String(bad))
})

test('version A names the reading book and escapes it',async()=>{
 const {render}=await load()
 const m=render({version:'A',name:'Sam',title:'Pride & <Prejudice>',author:'Jane Austen',book_count:3,token})
 assert.equal(m.subject,'Are you still reading Pride & <Prejudice>?')
 assert.match(m.html,/Hello Sam,/)
 assert.match(m.html,/<b>Pride &amp; &lt;Prejudice&gt;<\/b> by Jane Austen/)
 assert.match(m.html,/Update my reading/)
 assert.match(m.html,/Show your stats\./)
 assert.throws(()=>render({version:'A',title:'',token}))
})

test('version B handles one book and many',async()=>{
 const {render}=await load()
 assert.match(render({version:'B',book_count:1,token}).text,/You have 1 book on your BookLog shelf, and it is not marked as Reading\./)
 assert.match(render({version:'B',book_count:12,token}).text,/You have 12 books on your BookLog shelf, and none marked as Reading\./)
 assert.equal(render({version:'B',book_count:2,token}).subject,'What are you reading now?')
})

test('version C has starter books and no stats line',async()=>{
 const {render}=await load()
 const m=render({version:'C',name:'',book_count:0,token})
 assert.equal(m.subject,'Three books to start your BookLog library')
 assert.match(m.html,/Hello,<\/p>/)
 assert.match(m.html,/Project Hail Mary/)
 assert.doesNotMatch(m.html,/Show your stats/)
 assert.ok(m.html.indexOf('Import from Goodreads')<m.html.indexOf('Recommend books'))
})

test('every version: BookLog team sign-off, one-time footer, own unsubscribe link and headers, no banned wording',async()=>{
 const {render,FROM}=await load()
 assert.equal(FROM,'BookLog <hello@booklogapp.com>')
 for(const v of ['A','B','C']){
  const m=render({version:v,name:'Sam',title:'Dune',author:'Frank Herbert',book_count:4,token})
  for(const body of [m.html,m.text]){
   assert.match(body,/The BookLog team/)
   assert.match(body,/This is a one-time update for BookLog members\./)
   assert.match(body,new RegExp(`https://www\\.booklogapp\\.com/unsubscribe\\?t=${token}`))
   assert.match(body,new RegExp(`https://www\\.booklogapp\\.com/books\\?from=email&(amp;)?campaign=reader_update_1&(amp;)?v=${v}`))
   assert.doesNotMatch(body,BANNED)
  }
  assert.equal(m.headers['List-Unsubscribe'],`<https://www.booklogapp.com/api/unsubscribe?t=${token}>`)
  assert.equal(m.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click')
 }
 assert.throws(()=>render({version:'A',title:'Dune'}),/token/)
 assert.throws(()=>render({version:'D',token}))
})

test('CSV parser keeps commas and quotes inside titles',async()=>{
 const {parseCsv}=await loadSend()
 const rows=parseCsv('user_id,email,name,token,version,title,author,book_count\r\nu1,a@x.com,Sam,'+token+',A,"Eat, Pray, ""Love""",Liz Gilbert,3\r\n')
 assert.equal(rows.length,1)
 assert.equal(rows[0].title,'Eat, Pray, "Love"')
 assert.equal(rows[0].book_count,'3')
})

test('sending is guarded: confirm count, idempotency key, sent log, key from env only',()=>{
 const s=fs.readFileSync('scripts/reader-update/send.mjs','utf8')
 assert.match(s,/o\.confirm !== rows\.length/)
 assert.match(s,/"Idempotency-Key": idempotencyKey/)
 assert.match(s,/`\$\{CAMPAIGN\}\/\$\{r\.user_id\}`/)
 assert.match(s,/done\.has\(r\.user_id\)/)
 assert.match(s,/process\.env\.RESEND_API_KEY/)
 assert.doesNotMatch(s,/re_[A-Za-z0-9]{10,}/)
 assert.match(fs.readFileSync('scripts/reader-update/.gitignore','utf8'),/\*\.csv/)
 const sql=fs.readFileSync('scripts/reader-update/recipients.sql','utf8')
 assert.match(sql,/email_confirmed_at is not null/)
 assert.match(sql,/unsubscribed_at is null/)
 assert.match(sql,/count\(distinct id\)/)
 assert.doesNotMatch(sql.replace(/--.*$/gm,''),/\b(insert|update|delete|drop|alter)\b/i)
})

test('email clicks are recorded with campaign and version only',()=>{
 const p=fs.readFileSync('app/books/page.tsx','utf8')
 assert.match(p,/track\("email\.clicked", \{ campaign: .*version: .*\}\)/)
})

test('reader send is blocked until a postal address is set',()=>{
 const s=fs.readFileSync('scripts/reader-update/send.mjs','utf8')
 assert.match(s,/if \(!POSTAL_ADDRESS\.trim\(\)\) throw/)
 assert.ok(s.indexOf('POSTAL_ADDRESS.trim()')<s.indexOf('o.confirm !== rows.length'))
})
