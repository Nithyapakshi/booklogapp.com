const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), Module = require("module")
const ts = require("typescript")
const src = fs.readFileSync(path.join(__dirname, "../app/actions/ai-recommendations.ts"), "utf8")

function load(fetchImpl, modelJson, seen, rejectIdentity=false) {
  const js = ts.transpileModule(src, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText
  const m = new Module("ai-recs"); m.paths = Module._nodeModulePaths(__dirname)
  const orig = Module._load
  Module._load = (req, ...r) => req === "@/lib/book-catalog" ? {resolveCatalogBook:async(title,author)=>({book:rejectIdentity?null:{id:"verified",title,author,cover:"",description:""}})} : req === "@/lib/ai-budget" ? {budgetedMessage:async (a) => {seen && seen.push({messages:[{content:a.prompt}]});return {content:[{type:"text",text:modelJson}]}}} : orig(req, ...r)
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

test("Ask removes a model pair when catalog corroboration fails",async()=>{const {mod,restore}=load(async()=>json({},429),JSON.stringify([{title:"The Kiss Quotient",author:"Sally Thorne",on_topic:true}]),null,true);try{assert.deepEqual(await mod.getAIBookRecommendations("romance"),[])}finally{restore()}})
