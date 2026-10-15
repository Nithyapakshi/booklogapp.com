const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), Module = require("module")
const ts = require("typescript")
const src = fs.readFileSync(path.join(__dirname, "../app/actions/ai-recommendations.ts"), "utf8")

function load(fetchImpl, modelJson, seen) {
  const js = ts.transpileModule(src, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText
  const m = new Module("ai-recs"); m.paths = Module._nodeModulePaths(__dirname)
  const orig = Module._load
  Module._load = (req, ...r) => req === "@anthropic-ai/sdk" ? { default: class { messages = { create: async (a) => { seen && seen.push(a); return { content: [{ type: "text", text: modelJson }] } } } } } : orig(req, ...r)
  const realFetch = global.fetch; global.fetch = fetchImpl
  process.env.ANTHROPIC_API_KEY = "x"; delete process.env.VERCEL_ENV
  try { m._compile(js, "ai-recs.js") } finally { Module._load = orig }
  return { mod: m.exports, restore: () => { global.fetch = realFetch } }
}
const json = (o, status = 200) => ({ ok: status < 400, status, json: async () => o })

test("falls back to Open Library cover when Google is over its daily quota, without retrying Google", async () => {
  let google = 0
  const f = async (u) => { u = String(u); if (u.includes("googleapis")) { google++; return json({}, 429) } return json({ docs: [{ title: "Shoe Dog", author_name: ["Phil Knight"], editions: {docs: [{title:"Shoe Dog", language:["eng"],cover_i:8858487}]} }] }) }
  const { mod, restore } = load(f, JSON.stringify([{ title: "Shoe Dog", author: "Phil Knight", description: "d", genre: "Memoir", on_topic: true }]))
  const out = await mod.getAIBookRecommendations("x", [], 5); restore()
  assert.strictEqual(google, 1, "one Google call per book, no retries on 429")
  assert.strictEqual(out[0].cover, "https://covers.openlibrary.org/b/id/8858487-M.jpg")
})

test("does not accept an Open Library cover for a different book", async () => {
  const f = async (u) => String(u).includes("googleapis") ? json({}, 429) : json({ docs: [{ title: "Something Else", author_name: ["Other Person"], editions: {docs: [{title:"Something Else",language:["eng"],cover_i:1}]} }] })
  const { mod, restore } = load(f, JSON.stringify([{ title: "Shoe Dog", author: "Phil Knight", description: "d", genre: "g", on_topic: true }]))
  const out = await mod.getAIBookRecommendations("x", [], 5); restore()
  assert.strictEqual(out[0].cover, "")
})

test("drops books the model marks off-topic and strips the flag", async () => {
  const f = async () => json({}, 429)
  const { mod, restore } = load(f, JSON.stringify([
    { title: "The Everything Store", author: "Brad Stone", description: "An account of Jeff Bezos and Amazon.", genre: "Business", on_topic: true },
    { title: "Steve Jobs", author: "Walter Isaacson", description: "d", genre: "Biography", on_topic: false }]))
  const out = await mod.getAIBookRecommendations("show me books about Bezos", [], 8); restore()
  assert.deepStrictEqual(out.map((b) => b.title), ["The Everything Store"])
  assert.ok(!("on_topic" in out[0]))
})

test("prompt constrains subject requests to books about the subject", async () => {
  const seen = [], f = async () => json({}, 429)
  const { mod, restore } = load(f, "[]", seen)
  await mod.getAIBookRecommendations("books about Bezos", [], 8); restore()
  const p = seen[0].messages[0].content
  assert.match(p, /directly ABOUT that subject/); assert.match(p, /Return fewer books rather than padding/i)
})


test("explicit about-Bezos rejects another biography even if model labels it relevant", async () => {
  const { mod, restore } = load(async () => json({}, 429), JSON.stringify([
    { title: "Steve Jobs", author: "Walter Isaacson", description: "A biography of the Apple founder.", on_topic: true },
    { title: "The Everything Store", author: "Brad Stone", description: "The story of Jeff Bezos and Amazon.", on_topic: true },
    { title: "Amazon Unbound", author: "Brad Stone", description: "Jeff Bezos builds an empire.", on_topic: true },
    { title: "Missing Flag", author: "Test", description: "Bezos" }
  ]))
  try { assert.deepStrictEqual((await mod.getAIBookRecommendations("show me books about Bezos", [], 8)).map(b => b.title), ["The Everything Store", "Amazon Unbound"]) } finally { restore() }
})

test("taste query remains valid without literal phrase in each description", async () => {
  const { mod, restore } = load(async () => json({}, 429), JSON.stringify([
    { title: "The Test Novel", author: "Synthetic Author", description: "A bleak story of friendship and survival.", on_topic: true }
  ]))
  try { assert.strictEqual((await mod.getAIBookRecommendations("dark literary fiction", [], 8)).length, 1) } finally { restore() }
})

test("same first name is not an author match for fallback cover", async () => {
  const { mod, restore } = load(async u => String(u).includes("googleapis") ? json({}, 429) : json({docs: [{title: "Shoe Dog", author_name: ["Phil Smith"], editions: {docs: [{title:"Something Else",language:["eng"],cover_i:1}]}}]}), JSON.stringify([{title: "Shoe Dog", author: "Phil Knight", on_topic: true}]))
  try { assert.strictEqual((await mod.getAIBookRecommendations("taste", [], 5))[0].cover, "") } finally { restore() }
})

test("unrelated first Google hit cannot bypass matching", async () => {
  const { mod, restore } = load(async u => String(u).includes("googleapis") ? json({ items: [{ id: "wrong", volumeInfo: { title: "Different Book", authors: ["Phil Smith"], imageLinks: {thumbnail: "https://example.com/wrong.jpg"} } }] }) : json({ docs: [{title: "Shoe Dog", author_name: ["Phil Knight"], editions: {docs: [{title:"Shoe Dog", language:["eng"],cover_i:8858487}]}}] }), JSON.stringify([{title: "Shoe Dog", author: "Phil Knight", on_topic: true}]))
  try { const b = (await mod.getAIBookRecommendations("taste", [], 5))[0]; assert.strictEqual(b.cover, "https://covers.openlibrary.org/b/id/8858487-M.jpg"); assert.ok(!b.id.includes("wrong")) } finally { restore() }
})

test("work-level or foreign edition cover is never accepted", async () => {
 const {mod,restore}=load(async u=>String(u).includes("googleapis")?json({},429):json({docs:[{title:"Shoe Dog",author_name:["Phil Knight"],cover_i:1,editions:{docs:[{title:"Shoe Dog",language:["spa"],cover_i:2}]}}]}),JSON.stringify([{title:"Shoe Dog",author:"Phil Knight",on_topic:true}]))
 try {assert.strictEqual((await mod.getAIBookRecommendations("taste",[],5))[0].cover,"")} finally {restore()}
})

test("about dark literary fiction is a taste phrase, not a literal subject", async () => {
 const fixture=JSON.stringify([{title:"The Test Novel",author:"Synthetic Author",description:"A bleak story of friendship and survival.",on_topic:true}])
 for(const q of ["show me books about dark literary fiction","dark literary fiction","show me books about dark comedy","dark comedy","show me books about feel-good romance","feel-good romance","show me books about slow-burn thriller","slow-burn thriller"]){
  const {mod,restore}=load(async()=>json({},429),fixture)
  try{assert.strictEqual((await mod.getAIBookRecommendations(q,[],8)).length,1,q)}finally{restore()}
 }
})

test("genre words inside named topics do not bypass the subject guard",async()=>{
 const {mod,restore}=load(async()=>json({},429),JSON.stringify([{title:"Random",author:"Someone",description:"A novel about spies",on_topic:true}]))
 try{for(const q of ["books about Dark Matter","books about Bezos fiction"]){assert.deepStrictEqual(await mod.getAIBookRecommendations(q),[])}}finally{restore()}
})

test('translated work title still accepts exact English edition',async()=>{
 const f=async u=>String(u).includes('googleapis')?json({},429):json({docs:[{title:'Los detectives salvajes',author_name:['Roberto Bolaño'],editions:{docs:[{title:'The Savage Detectives',language:['eng'],cover_i:15210203}]}}]})
 const {mod,restore}=load(f,JSON.stringify([{title:'The Savage Detectives',author:'Roberto Bolaño',on_topic:true}]))
 try{assert.strictEqual((await mod.getAIBookRecommendations('taste'))[0].cover,'https://covers.openlibrary.org/b/id/15210203-M.jpg')}finally{restore()}
})
test('canonical author aliases bind Cyrillic display name',async()=>{
 const f=async u=>{u=String(u);if(u.includes('googleapis'))return json({},429);if(u.includes('/authors/OL22242A'))return json({name:'Фёдор Достоевский',alternate_names:['Fyodor Dostoevsky']});return json({docs:[{key:'/works/OL272063W',title:'The Brothers Karamazov',author_name:['Фёдор Достоевский'],author_key:['OL22242A'],editions:{docs:[{title:'The Brothers Karamazov',language:['eng'],cover_i:14889143}]}}]})}
 const {mod,restore}=load(f,JSON.stringify([{title:'The Brothers Karamazov',author:'Fyodor Dostoevsky',on_topic:true}]))
 try{assert.strictEqual((await mod.getAIBookRecommendations('taste'))[0].cover,'https://covers.openlibrary.org/b/id/14889143-M.jpg')}finally{restore()}
})
test('bounded editions scan finds covered English edition beyond first hit',async()=>{
 const f=async u=>{u=String(u);if(u.includes('googleapis'))return json({},429);if(u.includes('/editions.json'))return json({entries:[{title:'The Idiot',languages:[{key:'/languages/spa'}],covers:[1]},{title:'The Idiot',languages:[{key:'/languages/eng'}],covers:[14985202],authors:[{key:'/authors/OL22242A'}]}]});if(u.includes('/authors/OL22242A'))return json({name:'Fyodor Dostoevsky'});return json({docs:[{key:'/works/OL20906897W',title:'The Idiot',author_name:['Fyodor Dostoevsky'],author_key:['OL22242A'],editions:{docs:[{title:'The Idiot',language:['eng']}]}}]})}
 const {mod,restore}=load(f,JSON.stringify([{title:'The Idiot',author:'Fyodor Dostoevsky',on_topic:true}]))
 try{assert.strictEqual((await mod.getAIBookRecommendations('taste'))[0].cover,'https://covers.openlibrary.org/b/id/14985202-M.jpg')}finally{restore()}
})
test('edition author overrides work author and title-only collision is rejected',async()=>{
 const f=async u=>{u=String(u);if(u.includes('googleapis'))return json({},429);if(u.includes('/authors/OL1A'))return json({name:'Elif Batuman'});if(u.includes('/editions.json'))return json({entries:[{title:'The Idiot',languages:[{key:'/languages/eng'}],covers:[123],authors:[{key:'/authors/OL1A'}]}]});return json({docs:[{key:'/works/OL1W',title:'The Idiot',author_name:['Fyodor Dostoevsky'],editions:{docs:[]}}]})}
 const {mod,restore}=load(f,JSON.stringify([{title:'The Idiot',author:'Fyodor Dostoevsky',on_topic:true}]))
 try{assert.strictEqual((await mod.getAIBookRecommendations('taste'))[0].cover,'')}finally{restore()}
})

test('book detail modal omits the unwanted reason banner',()=>{assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'../components/book-details-dialog.tsx'),'utf8'),/Why this book:/)})

test('genre requests ignore separate trailing instructions',async()=>{
 const fixture=JSON.stringify([{title:'The Test Novel',author:'Synthetic Author',description:'Friends find comfort after loss.',on_topic:true}]);
 for(const q of ['books about literary fiction. Give specific reasons, not generic bestseller picks.','books about dark fiction! Give specific reasons.']){
  const {mod,restore}=load(async()=>json({},429),fixture);try{assert.equal((await mod.getAIBookRecommendations(q,[],8)).length,1,q)}finally{restore()}
 }
})
test('named subject ignores separate formatting instructions but still rejects unrelated biographies',async()=>{
 const {mod,restore}=load(async()=>json({},429),JSON.stringify([{title:'Amazon Unbound',author:'Brad Stone',description:'Jeff Bezos builds an empire.',on_topic:true},{title:'Steve Jobs',author:'Walter Isaacson',description:'Apple founder',on_topic:true}]));try{assert.deepEqual((await mod.getAIBookRecommendations('books about Bezos. Give specific reasons.')).map(b=>b.title),['Amazon Unbound'])}finally{restore()}
})
test('successful zero AI matches has explicit visible status rather than blank page',()=>{assert.match(fs.readFileSync(path.join(__dirname,'../app/books/page.tsx'),'utf8'),/recommendations\.length === 0/);assert.match(fs.readFileSync(path.join(__dirname,'../app/books/page.tsx'),'utf8'),/No verified matches for this request/)});

test('genre frame does not exempt named subjects from literal relevance',async()=>{
 const {mod,restore}=load(async()=>json({},429),JSON.stringify([{title:'Steve Jobs',author:'Walter Isaacson',description:'Apple founder',on_topic:true}]));try{for(const q of ['literary fiction about Bezos','novels about Bezos','fiction about Dark Matter'])assert.deepEqual(await mod.getAIBookRecommendations(q),[],q)}finally{restore()}
})

test('subject initials and earlier context sentences are preserved',async()=>{
 const fixture=JSON.stringify([{title:'Tolkien',author:'Humphrey Carpenter',description:'A biography of J. R. R. Tolkien.',on_topic:true},{title:'Steve Jobs',author:'Walter Isaacson',description:'Apple founder',on_topic:true}]);
 const {mod,restore}=load(async()=>json({},429),fixture);try{for(const q of ['books about J. R. R. Tolkien. Give specific reasons.','I want biographies. Books about Tolkien. Give specific reasons.'])assert.deepEqual((await mod.getAIBookRecommendations(q)).map(b=>b.title),['Tolkien'],q)}finally{restore()}
})
