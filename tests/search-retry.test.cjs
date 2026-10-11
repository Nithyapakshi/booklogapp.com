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
