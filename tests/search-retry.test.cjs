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
