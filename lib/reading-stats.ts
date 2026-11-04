// Stats page numbers, worked out only from the books already loaded on screen.
// Read-only by design: no database access, no writes. A book on both Completed and
// My Recommendations is one finished book.
import { isValidDate } from "./reading-dates"

type StatsBook = { id: string; title: string; author?: string; genre?: string; selfRating?: number; finishedAt?: string }
type Shelves = { completed?: StatsBook[]; recommended?: StatsBook[] }

export const STATS_MIN_FINISHED = 5 // books finished before genres and authors show
export const STATS_MIN_DATED = 5 // dated finished books before by-month stats unlock
export const STATS_MIN_RATED = 3 // rated books before an average is shown
export const STATS_CARD_SIZE = 4 // rows in the second card

export type SecondCard =
  | { kind: "authors"; items: { name: string; count: number }[] }
  | { kind: "topRated"; title: string; rotatingOf: number | null; items: { title: string; author: string; rating: number }[] }
  | null

export type ShelfLabel = "Completed" | "My Recommendations" | "Completed and My Recommendations"
export type GapBook = { id: string; title: string; author: string; shelf: ShelfLabel }

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
  showCharts: boolean
  showRatingsLine: boolean
  missingDates: GapBook[]
  missingRatings: GapBook[]
  byYear: { year: number; count: number }[] // every year from the first to the last dated year, gaps as 0
  defaultYear: number | null // current year if it has dated books, else the latest year that does
}

type Finished = StatsBook & { onCompleted: boolean; onRecommended: boolean }

const clean = (s?: string) => (s || "").trim().replace(/\s+/g, " ")
const key = (s?: string) => clean(s).toLowerCase()
const ratingOf = (b: StatsBook) => (typeof b.selfRating === "number" && b.selfRating > 0 ? b.selfRating : 0)
const yearOf = (d: string) => Number(d.slice(0, 4))

function finishedBooks(shelves: Shelves): Finished[] {
  const byId = new Map<string, Finished>()
  const add = (b: StatsBook, shelf: "completed" | "recommended") => {
    if (!b || !b.id) return
    const seen = byId.get(b.id)
    if (!seen) { byId.set(b.id, { ...b, onCompleted: shelf === "completed", onRecommended: shelf === "recommended" }); return }
    // Same book on both shelves: keep whatever each copy knows, never invent anything.
    if (shelf === "completed") seen.onCompleted = true
    else seen.onRecommended = true
    if (ratingOf(b) > ratingOf(seen)) seen.selfRating = b.selfRating
    if (!isValidDate(seen.finishedAt) && isValidDate(b.finishedAt)) seen.finishedAt = b.finishedAt
    if (!clean(seen.genre) && clean(b.genre)) seen.genre = b.genre
    if (!clean(seen.author) && clean(b.author)) seen.author = b.author
  }
  for (const b of shelves.completed || []) add(b, "completed")
  for (const b of shelves.recommended || []) add(b, "recommended")
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

// Small stable string hash, so the daily order is mixed but the same on every device.
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// Days since 1970 for the reader's local calendar day.
export function localDayNumber(today: Date): number {
  return Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000)
}

function topRatedCard(books: Finished[], today: Date): SecondCard {
  const good = books.filter(b => ratingOf(b) >= 4)
  if (good.length < 2) return null
  const top = Math.max(...good.map(ratingOf))
  const row = (b: Finished) => ({ title: clean(b.title), author: clean(b.author), rating: ratingOf(b) })
  const title = top === 5 ? "Your five-star books" : "Your top-rated books"
  const atTop = good.filter(b => ratingOf(b) === top)
  if (atTop.length > STATS_CARD_SIZE) {
    // A different few each day: walk a fixed mixed order 4 at a time, so every book comes round.
    const order = atTop.slice().sort((a, b) => hash(a.id) - hash(b.id) || a.id.localeCompare(b.id))
    const start = (localDayNumber(today) * STATS_CARD_SIZE) % order.length
    const items = Array.from({ length: STATS_CARD_SIZE }, (_, i) => row(order[(start + i) % order.length]))
    return { kind: "topRated", title, rotatingOf: atTop.length, items }
  }
  const items = good
    .slice()
    .sort((a, b) => ratingOf(b) - ratingOf(a) || clean(a.title).localeCompare(clean(b.title)))
    .slice(0, STATS_CARD_SIZE)
    .map(row)
  return { kind: "topRated", title, rotatingOf: null, items }
}

const shelfLabel = (b: Finished): ShelfLabel =>
  b.onCompleted && b.onRecommended ? "Completed and My Recommendations" : b.onRecommended ? "My Recommendations" : "Completed"
const gap = (b: Finished): GapBook => ({ id: b.id, title: clean(b.title), author: clean(b.author), shelf: shelfLabel(b) })
const byTitle = (a: Finished, b: Finished) => clean(a.title).localeCompare(clean(b.title))

// Books finished in each month (index 0 = January) of one year. Month-only dates count in their month.
export function monthCounts(shelves: Shelves, year: number): number[] {
  const counts = Array(12).fill(0)
  for (const b of finishedBooks(shelves)) {
    if (!isValidDate(b.finishedAt) || yearOf(b.finishedAt) !== year) continue
    counts[Number(b.finishedAt.slice(5, 7)) - 1]++
  }
  return counts
}

export function readingStats(shelves: Shelves, today: Date = new Date()): ReadingStats {
  const books = finishedBooks(shelves)
  const finished = books.length

  const ratings = books.map(ratingOf).filter(r => r > 0)
  const rated = ratings.length
  const averageRating = rated >= STATS_MIN_RATED ? Math.round((ratings.reduce((a, b) => a + b, 0) / rated) * 10) / 10 : null

  const genres = tally(books.map(b => b.genre || ""))
  const authors = tally(books.map(b => b.author || ""))
  const returned = authors.filter(a => a.count >= 2)

  // Repeat authors only make a card when there are at least two of them; one row looks empty.
  const secondCard: SecondCard = returned.length >= 2
    ? { kind: "authors", items: returned.slice(0, STATS_CARD_SIZE) }
    : topRatedCard(books, today)

  const datedBooks = books.filter(b => isValidDate(b.finishedAt))
  const dated = datedBooks.length
  const years = datedBooks.map(b => yearOf(b.finishedAt as string))
  const byYear: { year: number; count: number }[] = []
  if (years.length) {
    for (let y = Math.min(...years); y <= Math.max(...years); y++) byYear.push({ year: y, count: years.filter(v => v === y).length })
  }
  const thisYear = today.getFullYear()
  const defaultYear = years.length ? (years.includes(thisYear) ? thisYear : Math.max(...years)) : null

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
    showCharts: dated >= STATS_MIN_DATED,
    // Only while the average leans on fewer than half the finished books, so it never nags for ever.
    showRatingsLine: finished > 0 && rated * 2 < finished,
    missingDates: books.filter(b => !isValidDate(b.finishedAt)).sort(byTitle).map(gap),
    missingRatings: books.filter(b => ratingOf(b) === 0).sort(byTitle).map(gap),
    byYear,
    defaultYear,
  }
}
