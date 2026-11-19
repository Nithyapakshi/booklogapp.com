// Reading progress check-in: pure rules, shared by the card, the check-in and tests.
// A check-in is either a page (with an optional total) or a percentage. The card shows the newest one.

export type ProgressMode = "page" | "percent"

export interface ProgressEntry {
  bookId: string
  mode: ProgressMode
  page?: number
  percent?: number
  totalPages?: number
  createdAt: string
}

// From this point the card offers "Finished?" instead of "Update": many books end in notes and an index.
export const FINISH_OFFER_AT = 90
export const MAX_PAGES = 20000

const whole = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n)

// Page counts from public data are only trusted in a sensible range; anything else is left blank.
export function plausiblePageCount(n: unknown): number | null {
  const v = typeof n === "string" ? Number(n) : n
  return whole(v) && v >= 20 && v <= 5000 ? v : null
}

export function percentOf(e: ProgressEntry | undefined | null): number | null {
  if (!e) return null
  if (e.mode === "percent") return typeof e.percent === "number" ? Math.max(0, Math.min(100, Math.round(e.percent))) : null
  if (whole(e.page) && whole(e.totalPages) && e.totalPages > 0) return Math.max(0, Math.min(100, Math.round((e.page / e.totalPages) * 100)))
  return null
}

export function pagesLeft(e: ProgressEntry | undefined | null): number | null {
  if (!e || !whole(e.totalPages) || e.totalPages <= 0) return null
  if (e.mode === "page") return whole(e.page) ? Math.max(0, e.totalPages - e.page) : null
  const pct = percentOf(e)
  return pct === null ? null : Math.max(0, Math.round(e.totalPages * (1 - pct / 100)))
}

// Card line: "37% · 239 left", "37%", or "Page 168" when the total is unknown.
export function progressSummary(e: ProgressEntry | undefined | null): string | null {
  if (!e) return null
  const pct = percentOf(e)
  const left = pagesLeft(e)
  if (pct !== null) return left !== null ? `${pct}% · ${left} left` : `${pct}%`
  return whole(e.page) ? `Page ${e.page}` : null
}

export function offerFinish(e: ProgressEntry | undefined | null): boolean {
  const pct = percentOf(e)
  return pct !== null && pct >= FINISH_OFFER_AT
}

// Validates what the reader typed. Returns an error to show, or null when it can be saved.
export function checkInError(mode: ProgressMode, value: string, total: string): string | null {
  const v = value.trim()
  if (!v) return mode === "page" ? "Enter the page you are on." : "Enter how far you are, from 0 to 100."
  const n = Number(v)
  if (mode === "percent") return Number.isFinite(n) && n >= 0 && n <= 100 ? null : "Enter a number from 0 to 100."
  if (!whole(n) || n < 0 || n > MAX_PAGES) return "Enter a whole page number."
  const t = total.trim()
  if (!t) return null
  const tn = Number(t)
  if (!whole(tn) || tn < 1 || tn > MAX_PAGES) return "Enter the total as a whole number of pages."
  return n <= tn ? null : "The page is past the total. Check either number."
}

// The newest check-in per book, from rows ordered newest first or in any order.
export function latestByBook(rows: ProgressEntry[]): Map<string, ProgressEntry> {
  const out = new Map<string, ProgressEntry>()
  for (const r of rows) {
    const have = out.get(r.bookId)
    if (!have || r.createdAt > have.createdAt) out.set(r.bookId, r)
  }
  return out
}

// "What's next?" after finishing: which version to show.
export type NextVariant = "up_next" | "shuffle" | "choose" | "discover"
export function whatsNextVariant(hasNextRead: boolean, queuedCount: number, shuffleMin = 3): NextVariant {
  if (hasNextRead) return "up_next"
  if (queuedCount >= shuffleMin) return "shuffle"
  return queuedCount > 0 ? "choose" : "discover"
}
