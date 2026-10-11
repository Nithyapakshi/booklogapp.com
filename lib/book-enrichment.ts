import { searchBooksRaw, type BookSearchResult } from "@/lib/google-books-api"

export type Enrichment = { cover?: string; description?: string; genre?: string; publishedYear?: number; author?: string }

// Stored when a book is added without an author. Treated as blank for backfill.
export const UNKNOWN_AUTHOR = "Unknown author"
export const isUnknownAuthor = (a: string | undefined | null) => !a || !a.trim() || a.trim().toLowerCase() === UNKNOWN_AUTHOR.toLowerCase()

const TITLE_MIN = 0.85 // title similarity when the author is known and also matches
const TITLE_MIN_NO_AUTHOR = 0.9 // stricter when only the title is known

const fold = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const baseTitle = (s: string) => fold(s.split(":")[0].replace(/\s*\([^)]*\)\s*/g, " "))

export function similarity(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length)
}

// How many of the entered author words are found (fuzzily, or as a prefix) in the result's author.
function authorHits(wanted: string[], have: string[]): number {
  return wanted.filter(w => have.some(h => h === w || (w.length >= 2 && h.startsWith(w)) || (w.length >= 4 && similarity(w, h) >= 0.75))).length
}

// Pure and strict about wrong matches: a wrong cover is worse than no cover, so anything uncertain returns null.
// With an author: the title must be ~85% similar and the author must fuzzily match.
// Without one: the title must be ~90% similar and every close candidate must be the same author (no ambiguity).
export function matchEnrichment(title: string, author: string, results: BookSearchResult[]): Enrichment | null {
  const wantTitle = baseTitle(title)
  if (!wantTitle) return null
  const noAuthor = isUnknownAuthor(author)
  const wantAuthor = noAuthor ? [] : fold(author).split(" ").filter(w => w.length > 1)
  if (!noAuthor && !wantAuthor.length) return null

  const scored = results.map(r => ({ r, sim: similarity(wantTitle, baseTitle(r.title)) }))
  let matches: BookSearchResult[]
  if (noAuthor) {
    const close = scored.filter(x => x.sim >= TITLE_MIN_NO_AUTHOR)
    if (!close.length) return null
    const best = Math.max(...close.map(x => x.sim))
    const top = close.filter(x => x.sim >= best - 0.03)
    // Several editions of one work share an author; different authors with the same title are ambiguous.
    const counts = new Map<string, number>()
    for (const x of top) { const k = fold(x.r.author); counts.set(k, (counts.get(k) || 0) + 1) }
    const [domAuthor, domCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    const dominant = counts.size === 1 || (domCount >= 3 && domCount >= top.length * 0.7)
    if (!dominant) return null
    matches = top.filter(x => fold(x.r.author) === domAuthor).map(x => x.r)
  } else {
    matches = scored.filter(x => x.sim >= TITLE_MIN).filter(x => {
      const have = fold(x.r.author).split(" ")
      return authorHits(wantAuthor, have) >= Math.min(2, wantAuthor.length)
    }).sort((a, b) => b.sim - a.sim).map(x => x.r)
    if (matches.length) {
      const bestSim = similarity(wantTitle, baseTitle(matches[0].title))
      matches = matches.filter(m => similarity(wantTitle, baseTitle(m.title)) >= bestSim - 0.03)
    }
  }
  if (!matches.length) return null
  const withCover = matches.find(m => m.cover)
  const withDescription = matches.find(m => m.description)
  const first = matches[0]
  const secure = (u: string) => u.replace(/^http:\/\//i, "https://")
  const out: Enrichment = {}
  if (withCover) out.cover = secure(withCover.cover)
  if (withDescription) out.description = withDescription.description
  const genre = first.genre && first.genre !== "General" ? first.genre : matches.find(m => m.genre && m.genre !== "General")?.genre
  if (genre) out.genre = genre
  const year = first.publishedYear ?? matches.find(m => m.publishedYear)?.publishedYear
  if (year && Number.isFinite(year)) out.publishedYear = year
  if (noAuthor && first.author && first.author !== "Unknown Author") out.author = first.author
  return Object.keys(out).length ? out : null
}

// Best effort. Never throws: a failed lookup just means the book keeps blank details.
export async function lookupEnrichment(title: string, author: string): Promise<Enrichment | null> {
  try {
    if (isUnknownAuthor(author)) return matchEnrichment(title, author, await searchBooksRaw(title))
    const found = matchEnrichment(title, author, await searchBooksRaw(`${title} ${author}`))
    if (found) return found
    // A misspelled author can throw off the combined query, so retry on the title alone.
    return matchEnrichment(title, author, await searchBooksRaw(title))
  } catch {
    return null
  }
}
