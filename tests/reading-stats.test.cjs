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

test("top genre only when one clearly leads: 2+ books and no tie", () => {
  assert.equal(readingStats({ completed: [book({ genre: "Business" }), book({ genre: "Fiction" }), ...many(3)] }).topGenre, null)
  assert.equal(readingStats({ completed: [book({ genre: "Business" }), ...many(4)] }).topGenre, null)
  assert.equal(readingStats({ completed: [book({ genre: "A" }), book({ genre: "A" }), book({ genre: "B" }), book({ genre: "B" }), book()] }).topGenre, null)
  assert.deepEqual(readingStats({ completed: [book({ genre: "A" }), book({ genre: "A" }), book({ genre: "B" }), ...many(2)] }).topGenre, { name: "A", count: 2 })
  // The Top genres list still shows every genre, ties included.
  assert.equal(readingStats({ completed: [book({ genre: "Business" }), book({ genre: "Fiction" }), ...many(3)] }).genres.length, 2)
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

test("second card: 2+ repeat authors first, then top-rated books, else nothing", () => {
  const authors = readingStats({ completed: [book({ author: "A" }), book({ author: "A" }), book({ author: "B" }), book({ author: "B" }), book({ selfRating: 5 }), book({ selfRating: 5 })] }).secondCard
  assert.equal(authors.kind, "authors")
  assert.deepEqual(authors.items, [{ name: "A", count: 2 }, { name: "B", count: 2 }])
  // One repeat author is not enough for a card: fall back to top-rated books.
  const oneRepeat = readingStats({ completed: [book({ author: "A" }), book({ author: "A" }), book({ selfRating: 5 }), book({ selfRating: 5 })] })
  assert.equal(oneRepeat.secondCard.kind, "topRated")
  assert.equal(oneRepeat.repeatAuthors, 1)
  const top = readingStats({ completed: [book({ title: "Zed", selfRating: 4 }), book({ title: "Alpha", selfRating: 5 }), book({ title: "Beta", selfRating: 4 }), book({ selfRating: 3 })] }).secondCard
  assert.equal(top.kind, "topRated")
  assert.equal(top.title, "Your five-star books")
  assert.equal(top.rotatingOf, null)
  assert.deepEqual(top.items.map(b => b.title), ["Alpha", "Beta", "Zed"])
  assert.equal(readingStats({ completed: [book({ selfRating: 4 }), book({ selfRating: 4 })] }).secondCard.title, "Your top-rated books")
  assert.equal(readingStats({ completed: [book({ selfRating: 5 }), book({ selfRating: 3 })] }).secondCard, null)
  assert.equal(readingStats({ completed: many(3) }).secondCard, null)
})

test("top-rated books rotate daily when more than 4 share the top rating", () => {
  const fives = many(24, { selfRating: 5 })
  const shelves = { completed: [...fives, book({ selfRating: 4 })] }
  const day = d => new Date(2026, 10, d, 9)
  const card = readingStats(shelves, day(4)).secondCard
  assert.equal(card.rotatingOf, 24)
  assert.equal(card.items.length, 4)
  assert.ok(card.items.every(b => b.rating === 5))
  // Same set all day, whatever the hour.
  assert.deepEqual(readingStats(shelves, new Date(2026, 10, 4, 23, 59)).secondCard.items, card.items)
  // A different set the next day.
  assert.notDeepEqual(readingStats(shelves, day(5)).secondCard.items, card.items)
  // Every five-star book comes round within 6 days (24 / 4).
  const seen = new Set()
  for (let d = 4; d < 10; d++) readingStats(shelves, day(d)).secondCard.items.forEach(b => seen.add(b.title))
  assert.equal(seen.size, 24)
})

test("four or fewer five-star books: no rotation, filled from 4-star books", () => {
  const card = readingStats({ completed: [book({ title: "A", selfRating: 5 }), book({ title: "B", selfRating: 5 }), book({ title: "C", selfRating: 4 }), book({ title: "D", selfRating: 4 }), book({ title: "E", selfRating: 4 })] }).secondCard
  assert.equal(card.rotatingOf, null)
  assert.deepEqual(card.items.map(b => b.title), ["A", "B", "C", "D"])
})

test("missing dates and ratings: one row per book, only blanks, with the shelf it is on", () => {
  const both = book({ title: "Both", selfRating: 0 })
  const s = readingStats({
    completed: [both, book({ title: "Dated", finishedAt: "2025-03-01", selfRating: 4 }), book({ title: "Bad date", finishedAt: "2025-02-30", selfRating: 5 })],
    recommended: [{ ...both }, book({ title: "Rec only", finishedAt: "2024-01-01" })],
  })
  assert.deepEqual(s.missingDates.map(b => [b.title, b.shelf]), [["Bad date", "Completed"], ["Both", "Completed and My Recommendations"]])
  assert.deepEqual(s.missingRatings.map(b => [b.title, b.shelf]), [["Both", "Completed and My Recommendations"], ["Rec only", "My Recommendations"]])
})

test("month and year counts use finish dates only", () => {
  const { monthCounts } = load("lib/reading-stats.ts", { "./reading-dates": dates })
  const shelves = { completed: [
    book({ finishedAt: "2026-01-01" }), book({ finishedAt: "2026-01-20" }), book({ finishedAt: "2026-07-01" }),
    book({ finishedAt: "2023-05-01" }), book({ finishedAt: "2026-13-01" }), book(),
  ] }
  const counts = monthCounts(shelves, 2026)
  assert.equal(counts[0], 2)
  assert.equal(counts[6], 1)
  assert.equal(counts.reduce((a, b) => a + b, 0), 3)
  const s = readingStats(shelves, new Date(2026, 10, 4))
  assert.deepEqual(s.byYear, [{ year: 2023, count: 1 }, { year: 2024, count: 0 }, { year: 2025, count: 0 }, { year: 2026, count: 3 }])
  assert.equal(s.defaultYear, 2026)
  // No dated books this year: default to the latest year that has some.
  assert.equal(readingStats(shelves, new Date(2027, 0, 2)).defaultYear, 2026)
  assert.equal(readingStats({ completed: many(3) }).defaultYear, null)
})

test("charts replace the dates card at 5 dated books", () => {
  const four = readingStats({ completed: many(4, { finishedAt: "2026-01-01" }) })
  assert.equal(four.showCharts, false)
  assert.equal(four.showDatesCard, true)
  const five = readingStats({ completed: many(5, { finishedAt: "2026-01-01" }) })
  assert.equal(five.showCharts, true)
  assert.equal(five.showDatesCard, false)
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

test("Stats never writes outside Fill in the gaps", () => {
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

test("Fill in the gaps only fills a finish date or a rating, through the existing save functions", () => {
  const src = fs.readFileSync("components/stats-fill-gaps.tsx", "utf8")
  assert.doesNotMatch(src, /supabase/i)
  assert.doesNotMatch(src, /\.(insert|update|upsert|delete)\(/)
  assert.doesNotMatch(src, /createBook|moveBook|addBook|removeBook|updateNote|editBook|fillMissingDetails/)
  assert.doesNotMatch(src, /startedAt|startedPrecision/)
  assert.match(src, /saveDates\(b\.id, \{ finishedAt: /)
  assert.match(src, /updateRating\(b\.id, /)
  // Rows come from the missing lists only, so a book that already had a date or rating is never offered.
  assert.match(src, /missingDates/)
  assert.match(src, /missingRatings/)
})
