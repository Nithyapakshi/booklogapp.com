const test = require("node:test")
const assert = require("node:assert")
const fs = require("fs")
const ts = require("typescript")
const src = fs.readFileSync("lib/goodreads-import.ts", "utf8")
const mod = { exports: {} }
new Function("module", "exports", ts.transpileModule(src, { compilerOptions: { module: "commonjs" } }).outputText)(mod, mod.exports)
const { parseCsv, parseGoodreadsCsv, cleanIsbn, cleanTitle, shelfToStatus, cleanRating, cleanDate, htmlToText, countByStatus, planImport, MAX_IMPORT_BOOKS } = mod.exports
const idMod = { exports: {} }
new Function("module", "exports", ts.transpileModule(fs.readFileSync("lib/book-identity.ts", "utf8"), { compilerOptions: { module: "commonjs" } }).outputText)(idMod, idMod.exports)
const { nearDuplicate } = idMod.exports

const TODAY = "2026-11-03"
const HEADER = "Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Owned Copies"
// Synthetic rows in the exact shape of a real Goodreads export (wrapped ISBNs, empty ISBNs, padded names, quoted commas).
const SAMPLE = [
  HEADER,
  `1,A Quiet Field,Jane Doe,"Doe, Jane",,"=""""","=""""",4.0,Pub,Kindle Edition,338,2009,2009,,2021/05/18,,,read,,,,1,0`,
  `2,"Making Things, Inc.: A Long Subtitle",Sam Roe,"Roe, Sam",Amy    Helper,"=""0812993012""","=""9780812993011""",5.0,Pub,Hardcover,368,2014,2014,2021/05/10,2021/05/18,,,read,"Loved it.<br/><br/>Would reread &amp; share.",,Keep for later,1,0`,
  `3,The Night Garden (Garden Tales #2),Lee   Park,"Park, Lee",,"=""""","=""""",0,Pub,Paperback,258,2005,1989,,2019/08/24,to-read,to-read (#7),to-read,,,,0,0`,
  `4,Halfway There,Kim Lo,"Lo, Kim",,"=""140130138X""","=""""",0,Pub,Hardcover,340,2007,2007,,2019/08/18,,,currently-reading,,,,0,0`,
  `5,Put Down For Now,Ana Bo,"Bo, Ana",,"=""""","=""""",2,Pub,Hardcover,340,2007,,,2019/08/18,did-not-finish,,did-not-finish,,,,0,0`,
  ``,
].join("\r\n")

test("parses a Goodreads export into books with the agreed status mapping", () => {
  const r = parseGoodreadsCsv(SAMPLE, TODAY)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.books.length, 5)
  assert.deepStrictEqual(r.books.map(b => b.status), ["completed", "completed", "queued", "reading", "onHold"])
  assert.deepStrictEqual(countByStatus(r.books), { reading: 1, queued: 1, completed: 2, onHold: 1 })
})

test("read books go to Completed only, never Recommendations", () => {
  const r = parseGoodreadsCsv(SAMPLE, TODAY)
  assert.ok(r.books.every(b => b.status !== "recommended"))
  assert.strictEqual(shelfToStatus("read"), "completed")
})

test("ISBN wrappers are stripped and empty wrappers become blank", () => {
  const r = parseGoodreadsCsv(SAMPLE, TODAY)
  assert.strictEqual(r.books[0].isbn13, "")
  assert.strictEqual(r.books[0].isbn10, "")
  assert.strictEqual(r.books[1].isbn13, "9780812993011")
  assert.strictEqual(r.books[1].isbn10, "0812993012")
  assert.strictEqual(r.books[3].isbn10, "140130138X")
  assert.strictEqual(cleanIsbn('="12345"'), "")
})

test("quoted commas, padded names and series suffixes are cleaned", () => {
  const r = parseGoodreadsCsv(SAMPLE, TODAY)
  assert.strictEqual(r.books[1].title, "Making Things, Inc.: A Long Subtitle")
  assert.strictEqual(r.books[2].title, "The Night Garden")
  assert.strictEqual(r.books[2].author, "Lee Park")
  assert.strictEqual(cleanTitle("Harry Potter and the Sorcerer's Stone (Harry Potter, #1)"), "Harry Potter and the Sorcerer's Stone")
  assert.strictEqual(cleanTitle("Dune (40th Anniversary Edition)"), "Dune (40th Anniversary Edition)")
})

test("rating 0 means unrated; 1-5 kept", () => {
  const r = parseGoodreadsCsv(SAMPLE, TODAY)
  assert.deepStrictEqual(r.books.map(b => b.rating), [4, 5, null, null, 2])
  assert.strictEqual(cleanRating("0"), null)
  assert.strictEqual(cleanRating("7"), null)
  assert.strictEqual(cleanRating(""), null)
})

test("Date Read becomes the finish date only for read books, and never a future or impossible date", () => {
  const r = parseGoodreadsCsv(SAMPLE, TODAY)
  assert.strictEqual(r.books[0].finishedAt, null)
  assert.strictEqual(r.books[1].finishedAt, "2021-05-10")
  assert.strictEqual(cleanDate("2027/01/01", TODAY), null)
  assert.strictEqual(cleanDate("2021/02/30", TODAY), null)
  assert.strictEqual(cleanDate("", TODAY), null)
})

test("review and private notes become one plain-text note", () => {
  const r = parseGoodreadsCsv(SAMPLE, TODAY)
  assert.strictEqual(r.books[1].notes, "Loved it.\n\nWould reread & share.\n\nKeep for later")
  assert.strictEqual(r.books[0].notes, "")
  assert.strictEqual(htmlToText("<b>Bold</b> line<br>next"), "Bold line\nnext")
})

test("publication year prefers the original year", () => {
  const r = parseGoodreadsCsv(SAMPLE, TODAY)
  assert.strictEqual(r.books[2].publishedYear, 1989)
  assert.strictEqual(r.books[4].publishedYear, 2007)
})

test("non-Goodreads, empty and oversize files are refused with a clear message", () => {
  assert.strictEqual(parseGoodreadsCsv("", TODAY).ok, false)
  assert.match(parseGoodreadsCsv("Title,Author\nA,B", TODAY).error, /Goodreads export/)
  assert.match(parseGoodreadsCsv(HEADER + "\r\n", TODAY).error, /couldn't find any books/)
  const many = [HEADER, ...Array.from({ length: MAX_IMPORT_BOOKS + 1 }, (_, i) => `${i},Book ${i},Author,,,,,0,,,,,,,,,,to-read,,,,0,0`)].join("\n")
  assert.match(parseGoodreadsCsv(many, TODAY).error, /up to 1000/)
})

test("rows without a title or author are skipped and counted", () => {
  const r = parseGoodreadsCsv([HEADER, `1,,Someone,,,,,0,,,,,,,,,,read,,,,0,0`, `2,Real Book,Writer,,,,,0,,,,,,,,,,read,,,,0,0`].join("\n"), TODAY)
  assert.strictEqual(r.books.length, 1)
  assert.strictEqual(r.skippedRows, 1)
})

test("CSV parser handles BOM, CRLF, doubled quotes and line breaks inside quotes", () => {
  assert.deepStrictEqual(parseCsv('﻿a,b\r\n"x ""y""","line1\nline2"\r\n'), [["a", "b"], ['x "y"', "line1\nline2"]])
})

test("import runner only adds books, through the manual-add path, without spending Google Books quota", () => {
  const run = fs.readFileSync("lib/goodreads-import-run.ts", "utf8")
  assert.match(run, /rpc\("save_book_details"/)
  assert.match(run, /p_edit: false/)
  assert.doesNotMatch(run, /googleapis/)
  assert.doesNotMatch(run, /\.delete\(\)/)
  assert.doesNotMatch(run, /recommended/)
  assert.match(run, /nearDuplicate/)
  // The only updates are the finish date on the book just created and its note.
  assert.strictEqual((run.match(/\.update\(/g) || []).length, 1)
  assert.match(run, /\.eq\("status", "completed"\)/)
})

test("Settings shows the Goodreads import next to the CSV download", () => {
  const page = fs.readFileSync("app/settings/page.tsx", "utf8")
  assert.ok(page.indexOf("<GoodreadsImport />") > page.indexOf("Download CSV"))
})

const book = (title, author, status = "queued") => ({ title, author, status, isbn13: "", isbn10: "", rating: null, finishedAt: null, notes: "", publishedYear: null })

test("planning skips exact matches already in the library (re-running a file)", () => {
  const library = [{ id: "x", title: "Never Let Me Go", author: "Kazuo Ishiguro" }]
  const p = planImport([book("Never Let Me Go", "Kazuo Ishiguro"), book("Klara and the Sun", "Kazuo Ishiguro")], library, nearDuplicate)
  assert.strictEqual(p.alreadyInLibrary, 1)
  assert.deepStrictEqual(p.toImport.map(b => b.title), ["Klara and the Sun"])
})

test("planning skips near matches and repeats within the same file", () => {
  const library = [{ id: "x", title: "The Hobbit", author: "J.R.R. Tolkien" }]
  const p = planImport([book("Hobbit", "Tolkien, J.R.R."), book("Dune", "Frank Herbert"), book("Dune", "Frank  Herbert")], library, nearDuplicate)
  assert.strictEqual(p.alreadyInLibrary, 2)
  assert.deepStrictEqual(p.toImport.map(b => b.title), ["Dune"])
})

test("planning with an empty library imports everything once", () => {
  const p = planImport([book("A", "B"), book("C", "D")], [], nearDuplicate)
  assert.strictEqual(p.toImport.length, 2)
  assert.strictEqual(p.alreadyInLibrary, 0)
})

test("numeric HTML entities in reviews are decoded", () => {
  assert.strictEqual(htmlToText("It&#8217;s great &#x2014; truly"), "It\u2019s great \u2014 truly")
})
