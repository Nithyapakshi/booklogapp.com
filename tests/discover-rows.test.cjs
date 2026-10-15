const test = require("node:test")
const assert = require("node:assert")
const fs = require("fs")
const ts = require("typescript")
const src = fs.readFileSync("lib/discover-rows.ts", "utf8")
const mod = { exports: {} }
new Function("module", "exports", ts.transpileModule(src, { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText)(mod, mod.exports)
const { buildRowSpecs, assembleRows, takeTopPick, bookKey, blockedAuthors, loadDismissals, libraryHasBook } = mod.exports

const lib = [
  ...["Kafka on the Shore", "Norwegian Wood", "1Q84", "Sputnik Sweetheart", "After Dark"].map(t => ({ id: t, title: t, author: "Haruki Murakami", status: "completed", genre: "Fiction" })),
  { id: "d", title: "Dune", author: "Frank Herbert", status: "completed", selfRating: 5, genre: "Fiction" },
  { id: "e", title: "Emma", author: "Jane Austen", status: "reading", genre: "Fiction" },
  { id: "q", title: "Queued One", author: "Haruki Murakami", status: "queued", genre: "Fiction" },
]
const cand = (n, author, p = "c") => Array.from({ length: n }, (_, i) => ({ id: `${p}${i}`, title: `${p} Book ${i}`, author, cover: `https://x/${p}${i}.jpg` }))

test("row specs: most-read author, 5-star, genre share", () => {
  const specs = buildRowSpecs(lib)
  assert.strictEqual(specs[0].title, "Since you've read 5 books by Haruki Murakami") // queued book does not count
  assert.strictEqual(specs.find(s => s.kind === "rated").title, "Because you rated Dune 5 stars")
  assert.strictEqual(specs.find(s => s.kind === "genre").title, "Because 100% of your library is Fiction")
})
test("Completed + Currently Reading both count; one book by an author is not a row", () => {
  const specs = buildRowSpecs([{ title: "A", author: "Xavier Young", status: "completed" }, { title: "B", author: "Xavier Young", status: "reading" }, { title: "C", author: "Z Z", status: "completed" }])
  assert.strictEqual(specs.filter(s => s.kind === "author").length, 1)
  assert.match(specs[0].title, /2 books by Xavier Young/)
})
test("a book on two lists counts once; empty or tiny library gives no rows", () => {
  const two = [{ title: "A", author: "Xavier Young", status: "completed" }, { title: "A", author: "Xavier Young", status: "recommended", selfRating: 5 }]
  assert.strictEqual(buildRowSpecs(two).filter(s => s.kind === "author").length, 0)
  assert.strictEqual(buildRowSpecs(two).find(s => s.kind === "rated").title, "Because you rated A 5 stars")
  assert.deepStrictEqual(buildRowSpecs([]), [])
  assert.strictEqual(buildRowSpecs(lib.slice(0, 1)).filter(s => s.kind === "genre").length, 0)
})
test("never recommends library books, each book once across rows, 15 max", () => {
  const specs = buildRowSpecs(lib)
  const a = [{ id: "z", title: "Norwegian Wood", author: "Haruki Murakami", cover: "c" }, { id: "z2", title: "Dune", author: "Frank Herbert", cover: "c" }, ...cand(30, "Haruki Murakami", "m")]
  const shared = cand(20, "Someone Else", "s")
  const rows = assembleRows(specs, { [specs[0].key]: a, [specs.find(s => s.kind === "rated").key]: [...a.slice(2, 6), ...shared], [specs.find(s => s.kind === "genre").key]: shared }, lib, [])
  assert.strictEqual(rows[0].books.length, 15)
  assert.ok(!rows[0].books.some(b => b.title === "Norwegian Wood"))
  const all = rows.flatMap(r => r.books.map(b => bookKey(b.title, b.author)))
  assert.strictEqual(new Set(all).size, all.length)
  assert.ok(!all.includes(bookKey("Dune", "Frank Herbert")))
})
test("a row needs 4+ real suggestions; its books go back to the pool", () => {
  const specs = buildRowSpecs(lib)
  const few = cand(3, "Alma Brown", "f")
  const rows = assembleRows(specs, { [specs[0].key]: few, [specs.find(s => s.kind === "genre").key]: [...few, ...cand(2, "Alma Brown", "g")] }, lib, [])
  assert.strictEqual(rows.length, 1)
  assert.strictEqual(rows[0].books.length, 5)
  assert.strictEqual(assembleRows(specs, { [specs[0].key]: [...cand(10, "Alma Brown", "n").map(c => ({ ...c, cover: "" }))] }, lib, []).length, 0)
})
test("rated row skips the seed book's own author", () => {
  const specs = buildRowSpecs(lib), r = specs.find(s => s.kind === "rated")
  const rows = assembleRows([r], { [r.key]: [...cand(6, "Frank Herbert", "h"), ...cand(5, "Ursula Le Guin", "u")] }, lib, [])
  assert.ok(rows[0].books.every(b => b.author === "Ursula Le Guin"))
})
test("dismissals remove the book; three from one author remove the author; rows can fall below 4 and hide", () => {
  const specs = buildRowSpecs(lib), g = specs.find(s => s.kind === "genre")
  const list = cand(6, "Alma Brown", "p")
  const d1 = [{ key: bookKey(list[0].title, list[0].author), author: "Alma Brown" }]
  assert.strictEqual(assembleRows([g], { [g.key]: list }, lib, d1)[0].books.length, 5)
  const d2 = [...d1, { key: bookKey(list[1].title, "Alma Brown"), author: "Alma Brown" }]
  assert.strictEqual(blockedAuthors(d2).size, 0)
  const d3 = [...d2, { key: bookKey(list[2].title, "Alma Brown"), author: "Alma Brown" }]
  assert.ok(blockedAuthors(d3).has("alma brown"))
  assert.strictEqual(assembleRows([g], { [g.key]: list }, lib, d3).length, 0)
  assert.deepStrictEqual(loadDismissals("not json"), [])
})
test("top pick comes from the first row that keeps 4 books without it", () => {
  const rows = [{ key: "a", title: "A", reason: "r1", subtitle: "", books: cand(4, "Xavier Young", "a") }, { key: "b", title: "B", reason: "r2", subtitle: "", books: cand(6, "Xavier Young", "b") }]
  const t = takeTopPick(rows)
  assert.strictEqual(t.pick.title, "b Book 0"); assert.strictEqual(t.pick.reason, "r2")
  assert.strictEqual(t.rows[1].books.length, 5); assert.strictEqual(t.rows[0].books.length, 4)
  assert.strictEqual(takeTopPick([rows[0]]).pick, null)
})
test("library match is tolerant of The/subtitle but not of different books", () => {
  assert.ok(libraryHasBook({ title: "The Dune", author: "Frank Herbert" }, lib))
  assert.ok(libraryHasBook({ title: "Dune: Deluxe Edition", author: "F. Herbert" }, lib))
  assert.ok(!libraryHasBook({ title: "Dune Messiah", author: "Frank Herbert" }, lib))
})
test("wiring: server action never writes, dialog reason is not saved with the book, AI default stays 5", () => {
  const a = fs.readFileSync("app/actions/discover-rows.ts", "utf8")
  assert.ok(!/supabase|insert|update\(|delete\(/i.test(a))
  const d = fs.readFileSync("components/book-details-dialog.tsx", "utf8")
  assert.match(d, /createBook\(book, status\)/)
  assert.match(fs.readFileSync("app/actions/ai-recommendations.ts", "utf8"), /count: number = 5/)
})
// discover rows tests end

test('rated rows require five after filtering and preserve relevance order',()=>{
 const r={key:'rated:seed',kind:'rated',seedAuthor:'Seed Author',title:'Seed',subtitle:'Same spirit',reason:'Rated'}
 const c=cand(5,'Other Author','z').map((x,i)=>({...x,relevanceScore:i+1}))
 assert.equal(assembleRows([r],{[r.key]:c.slice(0,4)},[],[]).length,0)
 const rows=assembleRows([r],{[r.key]:c},[],[]);assert.equal(rows[0].books.length,5);assert.equal(rows[0].books[0].id,'z4')
 assert.equal(assembleRows([r],{[r.key]:c},[],[{key:bookKey(c[0].title,c[0].author),author:c[0].author}]).length,0)
 assert.equal(assembleRows([r],{[r.key]:c},[{...c[0]}],[]).length,0)
 assert.equal(takeTopPick(rows).pick,null);assert.equal(takeTopPick(rows).rows[0].books.length,5)
})
