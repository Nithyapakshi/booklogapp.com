const test=require('node:test'),assert=require('node:assert'),fs=require('node:fs'),Module=require('node:module'),ts=require('typescript'),path=require('node:path')
const m=new Module('catalog');m._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/book-catalog.ts'),'utf8'),{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText,'catalog.js')
const json=(data,status=200)=>({ok:status===200,status,json:async()=>data})
async function run(fetcher,title='The Kiss Quotient',author='Sally Thorne',description=false){const old=global.fetch;global.fetch=fetcher;try{return await m.exports.resolveCatalogBook(title,author,description)}finally{global.fetch=old}}
test('wrong model title-author pair is never corroborated by a title-only Google hit',async()=>{
 const x=await run(async u=>String(u).includes('googleapis')?json({items:[{id:'real',volumeInfo:{title:'The Kiss Quotient',authors:['Helen Hoang'],language:'en'}}]}):json({docs:[]}));assert.equal(x.book,null);assert.match(x.reason,/google_no_identity/)
})
test('verified Google identity may have no cover or description for Ask',async()=>{const x=await run(async()=>json({items:[{id:'real',volumeInfo:{title:'The Kiss Quotient',authors:['Helen Hoang'],language:'en'}}]}),'The Kiss Quotient','Helen Hoang');assert.equal(x.book.author,'Helen Hoang');assert.equal(x.book.cover,'')})
function ol(u,{wrongAuthor=false,description=true}={}){u=String(u)
 if(u.includes('googleapis'))return json({},429)
 if(u.includes('/search.json'))return json({docs:[{key:'/works/OL1W',title:'Foreign canonical title',author_name:['Helen Hoang'],author_key:['OL1A'],editions:{docs:[{key:'/books/OL1M',title:'The Kiss Quotient',language:['eng']}]}}]})
 if(u.includes('/works/'))return json({authors:[{author:{key:'/authors/OL1A'}}],description:description?'A study of grief and isolation.':''})
 if(u.includes('/books/'))return json({key:'/books/OL1M',title:'The Kiss Quotient',languages:[{key:'/languages/eng'}],works:[{key:'/works/OL1W'}],authors:[{key:wrongAuthor?'/authors/OL2A':'/authors/OL1A'}],covers:[12]})
 return json({name:u.includes('OL2A')?'Sally Thorne':'Helen Hoang'})
}
test('429 has a free corroborated English edition plus description fallback',async()=>{const x=await run(ol,'The Kiss Quotient','Helen Hoang',true);assert.equal(x.book.id,'/books/OL1M');assert.match(x.reason,/google_http_429;openlibrary_verified/);assert.match(x.book.description,/grief/);assert.equal(x.book.cover,'https://covers.openlibrary.org/b/id/12-M.jpg')})
test('full edition wrong author overrides work display name',async()=>{const x=await run(u=>ol(u,{wrongAuthor:true}),'The Kiss Quotient','Helen Hoang');assert.equal(x.book,null)})
test('same-spirit still refuses identity without corroborated description',async()=>{const x=await run(u=>ol(u,{description:false}),'The Kiss Quotient','Helen Hoang',true);assert.equal(x.book,null)})
test('status reason distinguishes zero results from HTTP errors without leaking queries or credentials',async()=>{for(const [status,reason] of [[200,'google_empty'],[403,'google_http_403'],[503,'google_http_503']]){const x=await run(async u=>String(u).includes('googleapis')?json({},status):json({docs:[]}));assert.match(x.reason,new RegExp(reason));assert.ok(!x.reason.includes('Sally'))}})

test('description from a different work is never used for relevance',async()=>{const x=await run(u=>{const r=ol(u);if(String(u).includes('/books/'))return json({key:'/books/OL1M',title:'The Kiss Quotient',languages:[{key:'/languages/eng'}],works:[{key:'/works/OL2W'}],authors:[{key:'/authors/OL1A'}]});return r},'The Kiss Quotient','Helen Hoang',true);assert.equal(x.book,null);assert.match(x.reason,/openlibrary_no_description/)})
