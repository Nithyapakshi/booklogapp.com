// Stats page numbers, worked out only from the books already loaded on screen.
// Read-only by design: no database access, no writes. A book on both Completed and
// My Recommendations is one finished book.
import { isValidDate } from "./reading-dates"

type StatsBook = { id: string; title: string; author?: string; genre?: string; selfRating?: number; finishedAt?: string }
type Shelves = { completed?: StatsBook[]; recommended?: StatsBook[] }

export const STATS_MIN_FINISHED = 5 // books finished before genres and authors show
export const STATS_MIN_DATED = 5 // dated finished books before by-month stats unlock
export const STATS_MIN_RATED = 3 // rated books before an average is shown

export type SecondCard =
  | { kind: "authors"; items: { name: string; count: number }[] }
  | { kind: "topRated"; items: { title: string; author: string; rating: number }[] }
  | null

export type ReadingStats = {
  finished: number
  full: boolean // false: the starter view for readers with fewer than STATS_MIN_FINISHED books
  booksToFull: number
  rated: number
  unrated: number
  averageRating: number | null
  topGenre: { name: string; count: number } | null
  genres: { name: string; count: number }[]
  authorsRead: number
  repeatAuthors: number
  secondCard: SecondCard
  dated: number
  datesNeeded: number
  showDatesCard: boolean
  showRatingsLine: boolean
}

const clean = (s?: string) => (s || "").trim().replace(/\s+/g, " ")
const key = (s?: string) => clean(s).toLowerCase()
const ratingOf = (b: StatsBook) => (typeof b.selfRating === "number" && b.selfRating > 0 ? b.selfRating : 0)

function finishedBooks(shelves: Shelves): StatsBook[] {
  const byId = new Map<string, StatsBook>()
  for (const b of [...(shelves.completed || []), ...(shelves.recommended || [])]) {
    if (!b || !b.id) continue
    const seen = byId.get(b.id)
    if (!seen) { byId.set(b.id, { ...b }); continue }
    // Same book on both shelves: keep whatever each copy knows, never invent anything.
    if (ratingOf(b) > ratingOf(seen)) seen.selfRating = b.selfRating
    if (!isValidDate(seen.finishedAt) && isValidDate(b.finishedAt)) seen.finishedAt = b.finishedAt
    if (!clean(seen.genre) && clean(b.genre)) seen.genre = b.genre
    if (!clean(seen.author) && clean(b.author)) seen.author = b.author
  }
  return [...byId.values()]
}

// Count by a normalised key, remembering the first spelling seen for display.
function tally(values: string[]): { name: string; count: number }[] {
  const counts = new Map<string, { name: string; count: number }>()
  for (const v of values) {
    const k = key(v)
    if (!k) continue
    const row = counts.get(k)
    if (row) row.count++
    else counts.set(k, { name: clean(v), count: 1 })
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function readingStats(shelves: Shelves): ReadingStats {
  const books = finishedBooks(shelves)
  const finished = books.length

  const ratings = books.map(ratingOf).filter(r => r > 0)
  const rated = ratings.length
  const averageRating = rated >= STATS_MIN_RATED ? Math.round((ratings.reduce((a, b) => a + b, 0) / rated) * 10) / 10 : null

  const genres = tally(books.map(b => b.genre || ""))
  const authors = tally(books.map(b => b.author || ""))
  const returned = authors.filter(a => a.count >= 2)

  let secondCard: SecondCard = null
  if (returned.length) secondCard = { kind: "authors", items: returned.slice(0, 4) }
  else {
    const top = books
      .filter(b => ratingOf(b) >= 4)
      .sort((a, b) => ratingOf(b) - ratingOf(a) || clean(a.title).localeCompare(clean(b.title)))
      .map(b => ({ title: clean(b.title), author: clean(b.author), rating: ratingOf(b) }))
    if (top.length >= 2) secondCard = { kind: "topRated", items: top.slice(0, 4) }
  }

  const dated = books.filter(b => isValidDate(b.finishedAt)).length

  return {
    finished,
    full: finished >= STATS_MIN_FINISHED,
    booksToFull: Math.max(0, STATS_MIN_FINISHED - finished),
    rated,
    unrated: finished - rated,
    averageRating,
    // A top genre only when one clearly leads: 2+ books and no tie for first.
    topGenre: genres[0] && genres[0].count >= 2 && (genres[1]?.count ?? 0) < genres[0].count ? genres[0] : null,
    genres: genres.slice(0, 5),
    authorsRead: authors.length,
    repeatAuthors: returned.length,
    secondCard,
    dated,
    datesNeeded: Math.max(0, STATS_MIN_DATED - dated),
    showDatesCard: dated < STATS_MIN_DATED,
    // Only while the average leans on fewer than half the finished books, so it never nags for ever.
    showRatingsLine: finished > 0 && rated * 2 < finished,
  }
}
