const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
function load(p, deps = {}) { const mod = { exports: {} }; new Function("module", "exports", "require", ts.transpileModule(fs.readFileSync(p, "utf8"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText)(mod, mod.exports, k => deps[k] || require(k)); return mod.exports }

function withWindow(storage, fn) {
  const old = global.window
  global.window = { localStorage: storage }
  try { return fn() } finally { global.window = old }
}
const memoryStorage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m } }

test("track never throws, never waits and ignores bad event names", () => {
  const inserted = []
  const client = { from: table => ({ insert: row => { inserted.push([table, row]); return Promise.reject(new Error("offline")) } }) }
  const usage = load("lib/usage.ts", { "@/lib/supabase/client": { createClientSupabaseClient: () => client } })
  withWindow(memoryStorage(), () => {
    assert.equal(usage.track("stats.opened", { a: 1 }, "book-1"), undefined)
    usage.track("Not An Event")
    usage.track("bad name.x")
  })
  assert.deepEqual(inserted, [["usage_events", { event: "stats.opened", detail: { a: 1 }, book_id: "book-1" }]])
  // A client that cannot even be created is swallowed too.
  const broken = load("lib/usage.ts", { "@/lib/supabase/client": { createClientSupabaseClient: () => { throw new Error("no env") } } })
  withWindow(memoryStorage(), () => assert.doesNotThrow(() => broken.track("stats.opened")))
  // On the server it does nothing.
  assert.doesNotThrow(() => usage.track("stats.opened"))
})

test("app.opened is recorded once per day per browser, and blocked storage is fine", () => {
  const events = []
  const client = { from: () => ({ insert: row => { events.push(row.event); return Promise.resolve({}) } }) }
  const usage = load("lib/usage.ts", { "@/lib/supabase/client": { createClientSupabaseClient: () => client } })
  const store = memoryStorage()
  withWindow(store, () => { usage.trackDailyOpen(); usage.trackDailyOpen() })
  assert.deepEqual(events, ["app.opened"])
  const blocked = { getItem: () => { throw new Error("blocked") }, setItem: () => { throw new Error("blocked") } }
  withWindow(blocked, () => assert.doesNotThrow(() => usage.trackDailyOpen()))
})

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === "node_modules" || e.name.startsWith(".") ? [] : sourceFiles(p)
    return /\.(tsx?|jsx?)$/.test(e.name) ? [p] : []
  })
}
const calls = []
for (const f of [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")]) {
  const src = fs.readFileSync(f, "utf8")
  for (const m of src.matchAll(/\btrack\(\s*([^,)]+)\s*(?:,\s*(\{[^}]*\}))?/g)) calls.push({ file: f, name: m[1], detail: m[2] || "" })
}

test("every recorded event has a valid name and no private details", () => {
  assert.ok(calls.length >= 30, `expected the app to be instrumented, found ${calls.length} calls`)
  for (const c of calls) {
    if (c.file.endsWith("lib/usage.ts")) continue
    // Event names are literals (a ternary between literals is fine), never built from reader data.
    assert.doesNotMatch(c.name, /`|\+/, `${c.file}: event name must be a literal: ${c.name}`)
    const names = [...c.name.matchAll(/"([^"]+\.[^"]+)"/g)].map(m => m[1])
    assert.ok(names.length, `${c.file}: event name must be a literal: ${c.name}`)
    for (const n of names) assert.match(n, /^[a-z_]+\.[a-z_]+$/, `${c.file}: ${n}`)
    assert.doesNotMatch(c.detail, /\b(note|notes|text|query|prompt|search|email|name|title|author|url)\s*:/i, `${c.file}: private detail in ${c.detail}`)
  }
})

test("the actions in the plan are all recorded", () => {
  const all = calls.map(c => c.name).join(" ")
  for (const e of [
    "import.goodreads_started", "import.goodreads_completed", "import.goodreads_stopped", "export.csv_downloaded",
    "share.book_copied", "share.book_whatsapp", "share.profile_copied", "share.profile_whatsapp",
    "discover.ask_ai", "discover.dismissed", "nav.opened", "theme.changed", "amazon.clicked",
    "book.added_from", "book.opened", "barcode.opened", "barcode.not_found", "link.empty_shelf_goodreads",
    "stats.fill_gaps_opened", "stats.gap_filled", "stats.import_clicked", "view.changed", "library.genre_filtered",
  ]) assert.ok(all.includes(`"${e}"`) || all.includes(e.split(".")[0]), `missing ${e}`)
  for (const source of ["search", "barcode", "discover", "starter_title", "manual", "shared_book"]) {
    assert.ok(fs.readFileSync("components/book-details-dialog.tsx", "utf8").includes("source") && JSON.stringify(calls).includes(source) || fs.readFileSync("components/book-search.tsx", "utf8").includes(`"${source}"`) || fs.readFileSync("app/books/page.tsx", "utf8").includes(`source="${source}"`), `missing add source ${source}`)
  }
})

test("database recording is fail-safe, private and owner-read-only", () => {
  const sql = fs.readFileSync("supabase/migrations/20261104_usage_events.sql", "utf8")
  // Every trigger function swallows its own errors.
  const fns = [...sql.matchAll(/create function public\.(usage_[a-z_]+)\(\) returns trigger[\s\S]*?end \$\$;/g)]
  assert.equal(fns.length, 6)
  for (const f of fns) assert.match(f[0], /exception when others then\s+null;/, f[1])
  assert.match(sql, /create function public\.usage_record[\s\S]*exception when others then\s+return;/)
  // Note text, names and email are never written into the log.
  assert.doesNotMatch(sql, /'(notes|text|email|title|author|name|message|reply_to|display_name)'\s*,\s*(new|old)\./)
  assert.doesNotMatch(sql, /new\.(email|message|reply_to|display_name|title|author)\b(?!\s+is distinct)/)
  // Readers can only insert their own app events; nobody but the owner can read.
  assert.match(sql, /revoke all on public\.usage_events from public, anon, authenticated;/)
  assert.match(sql, /grant insert \(event, book_id, detail\) on public\.usage_events to authenticated;/)
  assert.doesNotMatch(sql, /grant select[^;]*usage_events/)
  assert.match(sql, /with check \(user_id = auth\.uid\(\) and source = 'app'\)/)
  // Additive only.
  assert.doesNotMatch(sql, /\b(drop|truncate|alter table public\.(books|profiles|book_notes|next_read|book_shares|feedback))\b/i)
  assert.doesNotMatch(sql, /create or replace function public\.(book_membership|save_book_details|cleanup_book_note)/)
})
