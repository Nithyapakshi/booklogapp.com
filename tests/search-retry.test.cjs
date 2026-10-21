const test = require("node:test")
const assert = require("node:assert")
const fs = require("fs")
test("book search and detail retry transient Google Books errors", () => {
  const s = fs.readFileSync("lib/google-books-api.ts", "utf8")
  assert.match(s, /async function fetchWithRetry/)
  assert.match(s, /res\.status !== 429/)
  assert.equal((s.match(/fetchWithRetry\(/g) || []).length, 3) // definition + 2 uses
  assert.ok(!/await fetch\(\s*`https:\/\/www\.googleapis/.test(s), "no raw fetch left")
})

test("a sustained Google Books outage trips a circuit breaker instead of taxing every search and click", () => {
  const s = fs.readFileSync("lib/google-books-api.ts", "utf8")
  assert.match(s, /googleDownUntil/)
  assert.match(s, /googleDown\(\)/)
})

test("clicking a search result opens the dialog instantly and enriches in the background", () => {
  const s = fs.readFileSync("components/book-search.tsx", "utf8")
  assert.match(s, /setSelectedBook\(book\)\s+setSelectedBookInLibrary\(false\)\s+setDialogOpen\(true\)/)
})

test("searches during the breaker window do not push recovery further out", async () => {
  const vm = require("vm")
  const ts = require("typescript")
  let now = 1000000
  const fetchCalls = []
  const fetchStub = async (url) => {
    fetchCalls.push(url)
    if (String(url).includes("openlibrary.org")) return { ok: false, status: 500, json: async () => ({}) }
    return { ok: false, status: 503, json: async () => ({}) }
  }
  const module = { exports: {} }
  const js = ts.transpileModule(fs.readFileSync("lib/google-books-api.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, require: (k) => require(k), Error, console, process, Date: { now: () => now }, fetch: fetchStub, setTimeout: (f) => f(), AbortSignal, URLSearchParams, Number, String, Array, Promise })
  const api = module.exports

  // First failure trips the breaker (window: now -> now+5min).
  await assert.rejects(api.searchBooksRaw("dune"))
  const callsAfterTrip = fetchCalls.length

  // One minute later: short-circuit, no Google call, breaker NOT re-armed.
  now += 60 * 1000
  await assert.rejects(api.searchBooksRaw("dune"))
  assert.equal(fetchCalls.filter((u) => String(u).includes("googleapis")).length,
    fetchCalls.slice(0, callsAfterTrip).filter((u) => String(u).includes("googleapis")).length,
    "no Google call while the circuit is open")

  // 4.5 more minutes (5.5 min since the trip): had the second search re-armed the
  // breaker, Google would still be locked out. It must be tried again.
  now += 4.5 * 60 * 1000
  await assert.rejects(api.searchBooksRaw("dune"))
  assert.ok(fetchCalls.filter((u) => String(u).includes("googleapis")).length >
    fetchCalls.slice(0, callsAfterTrip).filter((u) => String(u).includes("googleapis")).length,
    "breaker recovers 5 minutes after the trip, not after the last search")
})

test("a slow enrichment from an earlier click cannot change the open dialog", () => {
  const s = fs.readFileSync("components/book-search.tsx", "utf8")
  // The in-library flag must live inside the same staleness guard as the book swap.
  const guard = s.indexOf("prev.id !== book.id")
  assert.ok(guard > 0, "staleness guard present")
  const inLib = s.indexOf("setSelectedBookInLibrary(!!findInLibrary(", s.indexOf("handleBookSelect"))
  assert.ok(inLib > guard && inLib - guard < 300, "setSelectedBookInLibrary is inside the prev.id guard")
  // And it must not also appear unguarded in the enrichment block.
  const after = s.slice(guard + 300, s.indexOf("handleSearch"))
  assert.ok(!after.includes("setSelectedBookInLibrary(!!findInLibrary("), "no unguarded setSelectedBookInLibrary in enrichment")
})
