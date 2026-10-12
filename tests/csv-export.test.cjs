const test = require("node:test")
const assert = require("node:assert")
const fs = require("fs")
const ts = require("typescript")
const src = fs.readFileSync("lib/csv-export.ts", "utf8")
const mod = { exports: {} }
new Function("module", "exports", ts.transpileModule(src, { compilerOptions: { module: "commonjs" } }).outputText)(mod, mod.exports)
const { buildLibraryCsv, csvCell, csvFileName, CSV_COLUMNS } = mod.exports
const id = r => r.id

test("header and one row per list entry, ordered by list then title", () => {
  const rows = [
    { id: "b", title: "Zed", author: "A", status: "completed", finished_at: "2026-10-10", self_rating: 4, genre: "Fiction", published_year: 2001 },
    { id: "a", title: "Alpha", author: "B", status: "reading", started_at: "2026-10-01" },
    { id: "c", title: "Beta", author: "C", status: "queued" },
    { id: "b", title: "Zed", author: "A", status: "recommended", self_rating: 4 },
  ]
  const csv = buildLibraryCsv(rows, new Map([["b", "Loved it"]]), id)
  assert.ok(csv.startsWith("\uFEFF"))
  const lines = csv.trim().split("\r\n")
  assert.strictEqual(lines[0].replace("\uFEFF", ""), CSV_COLUMNS.map(c => `"${c}"`).join(","))
  assert.strictEqual(lines.length, 5)
  assert.match(lines[1], /^"Alpha","B","Currently Reading","2026-10-01","","","","",""$/)
  assert.match(lines[2], /"Want to Read"/)
  assert.match(lines[3], /^"Zed","A","Completed","","2026-10-10","4","Fiction","2001","Loved it"$/)
  assert.match(lines[4], /"My Recommendations"/)
})
test("quotes, commas and line breaks stay in their cell", () => {
  const csv = buildLibraryCsv([{ id: "x", title: 'He said "hi", twice', author: "N", status: "onHold" }], new Map([["x", "line1\nline2, ok"]]), id)
  assert.ok(csv.includes('"He said ""hi"", twice"'))
  assert.ok(csv.includes('"line1\nline2, ok"'))
  assert.ok(csv.includes('"On Hold"'))
})
test("formula-looking text is neutralised, numbers and dates are untouched", () => {
  assert.strictEqual(csvCell("=SUM(A1)"), `"'=SUM(A1)"`)
  assert.strictEqual(csvCell("@x"), `"'@x"`)
  assert.strictEqual(csvCell("-5 days"), `"'-5 days"`)
  assert.strictEqual(csvCell("Dune"), '"Dune"')
  assert.strictEqual(csvCell("2026-10-10", false), '"2026-10-10"')
})
test("non-Latin text survives and empty library yields header only", () => {
  const csv = buildLibraryCsv([{ id: "k", title: "நூல் – Café", author: "ந", status: "completed" }], new Map(), id)
  assert.ok(csv.includes("நூல் – Café"))
  assert.strictEqual(buildLibraryCsv([], new Map(), id).trim().split("\r\n").length, 1)
})
test("file name uses the reader's local date", () => {
  assert.strictEqual(csvFileName(new Date(2026, 9, 5, 23, 59)), "booklog-library-2026-10-05.csv")
})
test("settings page wires the export, reads only the signed-in user's rows and never downloads a failed read", () => {
  const s = fs.readFileSync("app/settings/page.tsx", "utf8")
  assert.match(s, /Download CSV/)
  assert.match(s, /\.from\("books"\)\.select\("\*"\)\.eq\("user_id", user\.id\)/)
  assert.match(s, /if \(error \|\| !data\) throw/)
  assert.match(s, /nothing was downloaded/)
  assert.match(s, /Your library is empty/)
  // existing settings behaviour untouched
  assert.match(s, /Save changes/); assert.match(s, /Change password/); assert.match(s, /resetPasswordForEmail/)
})
