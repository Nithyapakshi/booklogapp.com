// Demo libraries (booklogapp.com/demo/<slug>) and the Ask AI gate: refusal before any model call, preview stub.
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), Module = require("module")
const ts = require("typescript")
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8")
const load = (p, req = require) => { const m = { exports: {} }; new Function("require", "module", "exports", ts.transpileModule(read(p), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText)(req, m, m.exports); return m.exports }

const bounds = load("lib/ai-bounds.ts")
const demo = load("lib/demo.ts")
const source = load("lib/signup-source.ts", () => ({ trackWithCountry: () => {} }))

// ---- Ask AI action with a counting fake SDK and a configurable fake Supabase ----
function loadAction({ user = { id: "u" }, userError = null, cap = { data: true, error: null }, marker = { data: [], error: { code: "42501" } }, env = {} } = {}) {
  const calls = { constructed: 0, created: 0, getUser: 0, rpc: 0, marker: 0 }
  const js = ts.transpileModule(read("app/actions/ai-recommendations.ts"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText
  const m = new Module("ai-demo"); m.paths = Module._nodeModulePaths(__dirname)
  const orig = Module._load
  Module._load = (req, ...r) => {
    if (req === "@anthropic-ai/sdk") return { default: class { constructor(o) { calls.constructed++; calls.options = o } messages = { create: async () => { calls.created++; return { content: [{ type: "text", text: "[]" }] } } } } }
    if (req === "@/lib/ai-bounds") return bounds
    if (req === "@supabase/supabase-js") return { createClient: () => ({
      auth: { getUser: async () => { calls.getUser++; return { data: { user: userError ? null : user }, error: userError } } },
      rpc: async (name) => { calls.rpc++; calls.rpcName = name; return cap },
      from: (t) => ({ select: () => ({ limit: async () => { calls.marker++; calls.markerTable = t; return marker } }) }),
    }) }
    return orig(req, ...r)
  }
  const saved = { ...process.env }
  Object.assign(process.env, { ANTHROPIC_API_KEY: "x", NEXT_PUBLIC_SUPABASE_URL: "http://sb", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" }, env)
  if (!("VERCEL_ENV" in env)) delete process.env.VERCEL_ENV
  const realFetch = global.fetch
  global.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) })
  try { m._compile(js, "ai-demo.js") } finally { Module._load = orig }
  return { mod: m.exports, calls, restore: () => { global.fetch = realFetch; process.env = saved } }
}

async function refuses(opts, args) {
  const { mod, calls, restore } = loadAction(opts)
  try {
    await assert.rejects(() => mod.getAIBookRecommendations(...args))
    assert.equal(calls.constructed, 0, "the Anthropic client must not be built")
    assert.equal(calls.created, 0, "no model call")
    return calls
  } finally { restore() }
}

test("Ask AI refuses a missing or invalid sign-in before any model call", async () => {
  for (const t of ["", undefined, "x".repeat(10001)]) {
    const c = await refuses({}, [t, "uplifting fiction", [], 8])
    assert.equal(c.rpc, 0, "nothing is called for a missing token")
  }
  // Expired / badly signed token: PostgREST rejects the gate call and the marker probe alike.
  const c = await refuses({ cap: { data: null, error: { code: "PGRST301" } }, marker: { data: null, error: { code: "PGRST301" } } }, ["bad", "uplifting fiction", [], 8])
  assert.equal(c.getUser, 0, "no Auth-server fallback while the demo tables exist or the token is rejected")
})

test("Ask AI refuses an oversized or empty request before any check or model call", async () => {
  const c = await refuses({}, ["tok", "a".repeat(1001), [], 8])
  assert.equal(c.rpc, 0)
  await refuses({}, ["tok", "   ", [], 8])
  await refuses({}, ["tok", 42, [], 8])
})

test("Ask AI refuses when the gate says no (revoked session, banned, demo cap, demo switched off)", async () => {
  const c = await refuses({ cap: { data: false, error: null } }, ["tok", "uplifting fiction", [], 8])
  assert.equal(c.rpcName, "ask_ai_allow")
  assert.equal(c.getUser, 0, "no Auth-server call on the normal path")
})

test("fail closed: demo tables exist but the gate function is missing or errors -> denied", async () => {
  for (const code of ["PGRST202", "42883", "57014"]) {
    const c = await refuses({ cap: { data: null, error: { code } }, marker: { data: [], error: { code: "42501" } } }, ["tok", "uplifting fiction", [], 8])
    assert.equal(c.marker, 1)
    assert.equal(c.markerTable, "demo_accounts")
    assert.equal(c.getUser, 0)
  }
  // Marker probe itself succeeding (table readable) also means the tables exist: denied.
  await refuses({ cap: { data: null, error: { code: "PGRST202" } }, marker: { data: [], error: null } }, ["tok", "uplifting fiction", [], 8])
})

test("only when the demo_accounts table does not exist (code before migration): old sign-in check, real readers can ask", async () => {
  for (const code of ["PGRST205", "42P01"]) {
    const { mod, calls, restore } = loadAction({ cap: { data: null, error: { code: "PGRST202" } }, marker: { data: null, error: { code } } })
    try { await mod.getAIBookRecommendations("tok", "uplifting fiction", [], 8); assert.equal(calls.created, 1); assert.equal(calls.getUser, 1) } finally { restore() }
  }
  await refuses({ cap: { data: null, error: { code: "PGRST202" } }, marker: { data: null, error: { code: "PGRST205" } }, userError: { message: "invalid" } }, ["tok", "uplifting fiction", [], 8])
})

test("the real client is built with retries fixed in code", async () => {
  const { mod, calls, restore } = loadAction()
  try {
    await mod.getAIBookRecommendations("tok", "uplifting fiction", [], 8)
    assert.equal(calls.constructed, 1)
    assert.equal(calls.options.maxRetries, 1)
    assert.equal(bounds.AI_MAX_RETRIES, 1)
  } finally { restore() }
})

test("preview: the stand-in client answers, the real client is never built, the full flow returns books", async () => {
  const { mod, calls, restore } = loadAction({ env: { VERCEL_ENV: "preview" } })
  try {
    const out = await mod.getAIBookRecommendations("tok", "uplifting fiction", [], 8)
    assert.equal(calls.constructed, 0)
    assert.equal(calls.created, 0)
    assert.equal(out.length, 8)
    for (const b of out) assert.ok(b.title && b.author && b.id)
  } finally { restore() }
  // Refusals still come first on preview.
  await refuses({ env: { VERCEL_ENV: "preview" }, cap: { data: false, error: null } }, ["tok", "uplifting fiction", [], 8])
})

test("input bounds: 1,000 characters refused not truncated; exclude list bounded", () => {
  assert.equal(bounds.checkQuery("a".repeat(1000)), "a".repeat(1000))
  assert.equal(bounds.checkQuery("a".repeat(1001)), null)
  const ex = bounds.boundExclude(Array.from({ length: 100 }, () => "t".repeat(500)))
  assert.equal(ex.length, 60)
  assert.ok(ex.every(t => t.length === 120))
  assert.deepEqual(bounds.boundExclude("nope"), [])
  const src = read("app/actions/ai-recommendations.ts")
  assert.match(src, /exclude = boundExclude\(exclude\)/)
  assert.doesNotMatch(src, /new Anthropic\(\{ apiKey: process\.env\.ANTHROPIC_API_KEY \}\)/, "no client without explicit retries")
})

test("demo helpers: slugs, env names, source, visitor ids", () => {
  assert.ok(demo.isDemoSlug("safar"))
  for (const s of ["", "Safar", "a b", "x".repeat(41), "../x", null]) assert.ok(!demo.isDemoSlug(s))
  assert.deepEqual(demo.demoEnvNames("book-ends"), { email: "DEMO_EMAIL_BOOK_ENDS", password: "DEMO_PASSWORD_BOOK_ENDS" })
  assert.deepEqual(demo.demoSourceVisit("safar", 5), { s: "bookclub", m: "demo", c: "safar", l: "/demo/safar", t: 5 })
  const id = demo.newVisitorId(n => new Uint8Array(n).fill(171))
  assert.equal(id, "ab".repeat(16))
  assert.ok(demo.isVisitorId(id))
  assert.ok(!demo.isVisitorId("user@example.com"))
})

test("demo source: first visit wins, except a referrer-only value from this same page load", () => {
  const now = Date.parse("2026-11-28T15:00:00Z")
  const d = demo.demoSourceVisit("safar", now)
  assert.deepEqual(source.nextDemoStored(null, d, now), d)
  assert.equal(source.nextDemoStored({ s: "linkedin", t: now - 86400e3 }, d, now), null)
  assert.deepEqual(source.nextDemoStored({ r: "mail.google.com", t: now - 1000 }, d, now), d)
  assert.equal(source.nextDemoStored({ r: "mail.google.com", t: now - 86400e3 }, d, now), null)
})

test("database: cap is atomic and per day, sign-ins are bounded, nothing stores a password", () => {
  const sql = read("supabase/migrations/20261128_demo_accounts.sql")
  assert.match(sql, /on conflict \(user_id, day\) do update set calls = c\.calls \+ 1 where c\.calls < 15/)
  assert.match(sql, /if not found then return true; end if;\s+-- a real reader/)
  assert.match(sql, /from auth\.sessions s where s\.id = sid and s\.user_id = uid/)
  assert.match(sql, /u\.banned_until > now\(\)/)
  assert.match(sql, /if not is_active then return false; end if;/)
  assert.match(sql, /where s\.signins < 20/)
  assert.match(sql, /grant execute on function public\.demo_signin_slot\(text\) to anon, authenticated;/)
  assert.doesNotMatch(sql, /grant execute on function[^;]*reset_demo/)
  assert.doesNotMatch(sql.replace(/--[^\n]*/g, ""), /password|(insert|update|delete)[^;]*auth\./i, "no password and no write to auth outside comments")
  assert.doesNotMatch(sql, /cron\./, "no schedule in the main migration")
  // Reset keeps analytics: the only usage_events delete is limited to rows written by the reset's own transaction.
  const reset = sql.slice(sql.indexOf("create function public.reset_demo"), sql.indexOf("$$;", sql.indexOf("create function public.reset_demo")))
  const deletes = reset.match(/delete from public\.usage_events[^;]*;/g) || []
  assert.deepEqual(deletes, ["delete from public.usage_events where user_id = p_user and source = 'db' and txid = txid_current();"])
  const cron = read("supabase/migrations/20261128b_demo_reset_schedule_PREVIEW_ONLY.sql")
  assert.match(cron, /PREVIEW ONLY/)
  assert.match(cron, /'0 23 \* \* \*'/)
})

test("app: banner only for demo accounts; survey, email prompt and signup-source record skipped for demos", () => {
  const page = read("app/books/page.tsx")
  assert.match(page, /\{isDemo === true && <DemoBanner \/>\}/)
  assert.match(page, /if \(user && isDemo === false\) recordSignupSource\(user\)/)
  assert.match(page, /surveyEvents === null \|\| isDemo !== false\) return/)
  assert.match(page, /!!linkedBook \|\| isDemo !== false,/)
  assert.match(page, /maxLength=\{AI_MAX_QUERY_CHARS\}/)
  const banner = read("components/demo-banner.tsx")
  assert.match(banner, /You are exploring a demo library\. Create your own free BookLog account\./)
  assert.match(banner, /auth\.signOut\(\)[\s\S]*window\.location\.href = "\/signup"/)
  const settings = read("app/settings/page.tsx")
  assert.match(settings, /\{isDemo !== true && <button/)
  const action = read("app/actions/demo.ts")
  assert.match(action, /demo_signin_slot[\s\S]*signInWithPassword[\s\S]*my_demo_slug/)
  assert.doesNotMatch(action, /console\.(log|error)/)
  assert.match(read("app/demo/[slug]/layout.tsx"), /index: false/)
})

test("metrics exclude demo accounts; reader emails never go to demos", () => {
  const q = read("docs/usage-queries.sql")
  assert.doesNotMatch(q.split("-- 13.")[0], /from usage_events\b(?!_real)/)
  assert.match(read("scripts/reader-update/recipients.sql"), /not exists \(select 1 from public\.demo_accounts/)
})
