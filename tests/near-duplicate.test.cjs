const test = require("node:test")
const assert = require("node:assert")
const fs = require("fs")
test("near-duplicate check warns but never blocks, in both add paths", () => {
  const id = fs.readFileSync("lib/book-identity.ts", "utf8")
  assert.match(id, /export function nearDuplicate/)
  const add = fs.readFileSync("app/books/add/page.tsx", "utf8")
  const dlg = fs.readFileSync("components/book-details-dialog.tsx", "utf8")
  for (const src of [add, dlg]) { assert.match(src, /nearDuplicate\(/); assert.match(src, /Add anyway/) }
  assert.match(add, /handleSubmit\(e as unknown as React\.FormEvent, true\)/)
  assert.match(dlg, /handleAddBook\(true\)/)
})
