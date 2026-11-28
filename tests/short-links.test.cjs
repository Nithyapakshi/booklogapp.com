const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs')

test('every short link forwards to /home with all three UTM tags, temporarily',async()=>{
 const {SHORT_LINKS,shortLinkRedirects}=await import('../lib/short-links.mjs')
 const r=shortLinkRedirects()
 assert.equal(r.length,Object.keys(SHORT_LINKS).length)
 for(const x of r){
  assert.match(x.source,/^\/go\/[a-z0-9_-]+$/)
  assert.equal(x.permanent,false)
  const u=new URL(x.destination,'https://www.booklogapp.com')
  assert.equal(u.pathname,'/home')
  for(const k of ['utm_source','utm_medium','utm_campaign'])assert.ok(u.searchParams.get(k),k)
 }
})

test('book club links carry the agreed tags',async()=>{
 const {shortLinkRedirects}=await import('../lib/short-links.mjs')
 const m=Object.fromEntries(shortLinkRedirects().map(x=>[x.source,x.destination]))
 assert.equal(m['/go/safar'],'/home?utm_source=bookclub&utm_medium=outreach&utm_campaign=safar')
 for(const c of ['bookends','downtown','elf','bookcellar'])assert.equal(m['/go/'+c],`/home?utm_source=bookclub&utm_medium=outreach&utm_campaign=${c}`)
})

test('a bad tag is refused at build time',async()=>{
 const {shortLinkRedirects}=await import('../lib/short-links.mjs')
 assert.throws(()=>shortLinkRedirects({'Bad Slug':{source:'x',medium:'y',campaign:'z'}}))
 assert.throws(()=>shortLinkRedirects({ok:{source:'x&y',medium:'y',campaign:'z'}}))
})

test('short links do not shadow an existing page',()=>{
 assert.equal(fs.existsSync('app/go'),false)
})

test('next.config wires the redirects in',()=>{
 const c=fs.readFileSync('next.config.mjs','utf8')
 assert.match(c,/import \{ shortLinkRedirects \} from '.\/lib\/short-links.mjs'/)
 assert.match(c,/async redirects\(\)\s*\{\s*return shortLinkRedirects\(\)/)
})
