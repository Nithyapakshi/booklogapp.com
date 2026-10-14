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
  const f = async (u) => { u = String(u); if (u.includes("googleapis")) { google++; return json({}, 429) } return json({ docs: [{ title: "Shoe Dog", author_name: ["Phil Knight"], cover_i: 8858487 }] }) }
  const { mod, restore } = load(f, JSON.stringify([{ title: "Shoe Dog", author: "Phil Knight", description: "d", genre: "Memoir", on_topic: true }]))
  const out = await mod.getAIBookRecommendations("x", [], 5); restore()
  assert.strictEqual(google, 1, "one Google call per book, no retries on 429")
  assert.strictEqual(out[0].cover, "https://covers.openlibrary.org/b/id/8858487-M.jpg")
})

test("does not accept an Open Library cover for a different book", async () => {
  const f = async (u) => String(u).includes("googleapis") ? json({}, 429) : json({ docs: [{ title: "Something Else", author_name: ["Other Person"], cover_i: 1 }] })
  const { mod, restore } = load(f, JSON.stringify([{ title: "Shoe Dog", author: "Phil Knight", description: "d", genre: "g", on_topic: true }]))
  const out = await mod.getAIBookRecommendations("x", [], 5); restore()
  assert.strictEqual(out[0].cover, "")
})

test("drops books the model marks off-topic and strips the flag", async () => {
  const f = async () => json({}, 429)
  const { mod, restore } = load(f, JSON.stringify([
    { title: "The Everything Store", author: "Brad Stone", description: "d", genre: "Business", on_topic: true },
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
