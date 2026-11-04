const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const ts = require("typescript")
function load(path, deps = {}) { const mod = { exports: {} }; new Function("module", "exports", "require", ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: "commonjs", target: "es2020" } }).outputText)(mod, mod.exports, k => deps[k] || require(k)); return mod.exports }
const dates = load("lib/reading-dates.ts")
const { readingStats } = load("lib/reading-stats.ts", { "./reading-dates": dates })

let n = 0
const book = (extra = {}) => ({ id: "b" + (++n), title: "Title " + n, author: "Author " + n, ...extra })
const many = (count, extra = {}) => Array.from({ length: count }, () => book(extra))

test("a book on both Completed and Recommendations counts once and keeps what each copy knows", () => {
  const a = book({ genre: "", selfRating: 0 })
  const s = readingStats({ completed: [a, ...many(4)], recommended: [{ ...a, genre: "History", selfRating: 5, finishedAt: "2026-03-01" }] })
  assert.equal(s.finished, 5)
  assert.equal(s.rated, 1)
  assert.equal(s.dated, 1)
  assert.deepEqual(s.genres, [{ name: "History", count: 1 }])
})

test("blank genres and zero ratings are ignored, never counted as values", () => {
  const s = readingStats({ completed: [book({ genre: "  ", selfRating: 0 }), book({ selfRating: undefined }), book({ genre: "Fantasy", selfRating: 4 })] })
  assert.equal(s.rated, 1)
  assert.equal(s.unrated, 2)
  assert.deepEqual(s.genres, [{ name: "Fantasy", count: 1 }])
})

test("genres and authors group case- and space-insensitively and sort by count then name", () => {
  const s = readingStats({ completed: [book({ genre: "History" }), book({ genre: "history " }), book({ genre: "Art" }), book({ genre: "Biography" })] })
  assert.deepEqual(s.topGenre, { name: "History", count: 2 })
  assert.deepEqual(s.genres.map(g => g.name), ["History", "Art", "Biography"])
  const t = readingStats({ completed: [book({ author: "Ursula K. Le Guin" }), book({ author: "ursula k.  le guin" }), book({ author: "Ann Patchett" })] })
  assert.equal(t.authorsRead, 2)
  assert.equal(t.repeatAuthors, 1)
})

test("average needs 3 rated books and rounds to one decimal", () => {
  assert.equal(readingStats({ completed: [book({ selfRating: 5 }), book({ selfRating: 4 })] }).averageRating, null)
  assert.equal(readingStats({ completed: [book({ selfRating: 5 }), book({ selfRating: 4 }), book({ selfRating: 4 })] }).averageRating, 4.3)
})

test("no genres means no top genre", () => {
  const s = readingStats({ completed: many(6) })
  assert.equal(s.topGenre, null)
  assert.deepEqual(s.genres, [])
})

test("starter view below 5 finished books, full view from 5", () => {
  assert.equal(readingStats({}).full, false)
  assert.equal(readingStats({}).booksToFull, 5)
  const four = readingStats({ completed: many(4) })
  assert.equal(four.full, false)
  assert.equal(four.booksToFull, 1)
  assert.equal(readingStats({ completed: many(5) }).full, true)
})

test("second card: repeat authors first, then top-rated books, else nothing", () => {
  const authors = readingStats({ completed: [book({ author: "A" }), book({ author: "A" }), book({ selfRating: 5 }), book({ selfRating: 5 })] }).secondCard
  assert.equal(authors.kind, "authors")
  assert.deepEqual(authors.items, [{ name: "A", count: 2 }])
  const top = readingStats({ completed: [book({ title: "Zed", selfRating: 4 }), book({ title: "Alpha", selfRating: 5 }), book({ title: "Beta", selfRating: 4 }), book({ selfRating: 3 })] }).secondCard
  assert.equal(top.kind, "topRated")
  assert.deepEqual(top.items.map(b => b.title), ["Alpha", "Beta", "Zed"])
  assert.equal(readingStats({ completed: [book({ selfRating: 5 }), book({ selfRating: 3 })] }).secondCard, null)
  assert.equal(readingStats({ completed: many(3) }).secondCard, null)
})

test("dated count ignores invalid dates and the dates card says how many more", () => {
  const s = readingStats({ completed: [book({ finishedAt: "2026-02-01" }), book({ finishedAt: "2026-02-30" }), book({ finishedAt: "garbage" }), book({ finishedAt: "2025-11-01" }), book()] })
  assert.equal(s.dated, 2)
  assert.equal(s.datesNeeded, 3)
  assert.equal(s.showDatesCard, true)
  const done = readingStats({ completed: many(5, { finishedAt: "2026-01-01" }) })
  assert.equal(done.showDatesCard, false)
  assert.equal(done.datesNeeded, 0)
})

test("ratings line shows below half rated and hides at half or more", () => {
  assert.equal(readingStats({ completed: [book({ selfRating: 4 }), ...many(2)] }).showRatingsLine, true)
  assert.equal(readingStats({ completed: [book({ selfRating: 4 }), book()] }).showRatingsLine, false)
  assert.equal(readingStats({}).showRatingsLine, false)
})

test("Stats never writes: no database access or library changes from the stats code", () => {
  for (const file of ["lib/reading-stats.ts", "components/stats-tab.tsx"]) {
    const src = fs.readFileSync(file, "utf8")
    assert.doesNotMatch(src, /supabase/i, file)
    assert.doesNotMatch(src, /\.(insert|update|upsert|delete)\(/, file)
    assert.doesNotMatch(src, /createBook|moveBook|addBook|removeBook|updateRating|updateNote|saveDates|editBook|fillMissingDetails/, file)
    assert.doesNotMatch(src, /localStorage/, file)
  }
})

test("Stats is one menu item and opens from /books?section=stats", () => {
  const sidebar = fs.readFileSync("components/sidebar.tsx", "utf8")
  assert.match(sidebar, /\{ id: "stats",\s+label: "Stats",\s+icon: BarChart3\s*\}/)
  const page = fs.readFileSync("app/books/page.tsx", "utf8")
  assert.match(page, /section === "discover" \|\| section === "recommended" \|\| section === "stats"/)
  assert.match(page, /sidebarTab === "stats" && \(/)
})
