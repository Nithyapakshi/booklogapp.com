import { searchBooks, type BookSearchResult } from "@/lib/google-books-api"

export type Enrichment = { cover?: string; description?: string; genre?: string; publishedYear?: number }

const fold = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const baseTitle = (s: string) => fold(s.split(":")[0].replace(/\s*\([^)]*\)\s*/g, " "))

// Pure and strict: only accept a result whose title matches and whose author shares a name with the entered author.
// A wrong cover is worse than no cover, so anything uncertain returns null.
export function matchEnrichment(title: string, author: string, results: BookSearchResult[]): Enrichment | null {
  const wantTitle = baseTitle(title)
  const wantAuthor = fold(author).split(" ").filter(w => w.length > 1)
  if (!wantTitle || !wantAuthor.length) return null
  const matches = results.filter(r => {
    if (baseTitle(r.title) !== wantTitle) return false
    const have = fold(r.author).split(" ")
    return wantAuthor.some(w => have.includes(w)) && wantAuthor.filter(w => have.includes(w)).length >= Math.min(2, wantAuthor.length)
  })
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
  return Object.keys(out).length ? out : null
}

// Best effort. Never throws: a failed lookup just means the book keeps blank details.
export async function lookupEnrichment(title: string, author: string): Promise<Enrichment | null> {
  try {
    const results = await searchBooks(`${title} ${author}`)
    return matchEnrichment(title, author, results)
  } catch {
    return null
  }
}
