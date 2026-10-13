// Runs in the browser (client-side) so Google Books sees the same key path as normal search.

import { validBookISBN, sameISBN, matchingEditions } from "@/lib/isbn"
import { isNewerEdition, normaliseGenre, type BookSearchResult } from "@/lib/google-books-api"

export type ISBNLookup = { ok: true; book: BookSearchResult } | { ok: false; error: string }

const GB_TRIES = 6
const cache = new Map<string, any[]>()

async function lookup(query: string): Promise<any[]> {
  const hit = cache.get(query)
  if (hit) return hit
  const key = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
  const params = new URLSearchParams({ q: query, maxResults: "40", printType: "books", orderBy: "relevance" })
  if (key) params.set("key", key)
  // Google Books answers 503 at random. Retry with a growing wait before giving up.
  for (let attempt = 0; attempt < GB_TRIES; attempt++) {
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { cache: "no-store", signal: AbortSignal.timeout(10000) })
      if (res.ok) { const data = await res.json(); const items = Array.isArray(data.items) ? data.items : []; cache.set(query, items); return items }
      if (res.status !== 429 && res.status < 500) throw new Error("Lookup unavailable")
    } catch { if (attempt === GB_TRIES - 1) throw new Error("Lookup unavailable") }
    if (attempt < GB_TRIES - 1) await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
  }
  throw new Error("Lookup unavailable")
}

// Free fallback used only when Google Books stays down: Open Library by exact ISBN. Fills title, author,
// cover (only if Open Library has one), year and genre. Returns null when anything essential is missing.
async function openLibraryByISBN(isbn: string): Promise<BookSearchResult | null> {
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, { cache: "no-store", signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const d = (await res.json())[`ISBN:${isbn}`]
    const title = typeof d?.title === "string" ? d.title : ""
    const author = Array.isArray(d?.authors) && d.authors[0]?.name ? d.authors.map((x: any) => x.name).join(", ") : ""
    if (!title || !author) return null
    const subjects: string[] = Array.isArray(d.subjects) ? d.subjects.map((x: any) => x?.name).filter(Boolean) : []
    const cover = d.cover?.medium || d.cover?.large || ""
    const year = Number.parseInt(String(d.publish_date || "").match(/\d{4}/)?.[0] || "", 10)
    return { id: `ol-${isbn}`, title, author, cover: String(cover).replace(/^http:/, "https:"), description: "", publishedYear: Number.isFinite(year) ? year : undefined, genre: normaliseGenre(subjects) }
  } catch { return null }
}

function mapBook(item: any): BookSearchResult {
  const info = item.volumeInfo || {}
  return {
    id: item.id, title: info.title || "Unknown Title", author: Array.isArray(info.authors) ? info.authors.join(", ") : "Unknown Author",
    cover: (info.imageLinks?.thumbnail || "").replace(/^http:/, "https:"),
    description: typeof info.description === "string" ? info.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "",
    publishedYear: info.publishedDate ? Number.parseInt(info.publishedDate.slice(0, 4), 10) || undefined : undefined,
    genre: normaliseGenre(info.categories),
  }
}

export async function resolveScannedISBN(input: string): Promise<ISBNLookup> {
  const isbn = validBookISBN(input)
  if (!isbn) return { ok: false, error: "Enter a valid 10- or 13-digit book ISBN." }
  let exactItems: any[]
  try { exactItems = await lookup(`isbn:${isbn}`) } catch {
    const ol = await openLibraryByISBN(isbn)
    return ol ? { ok: true, book: ol } : { ok: false, error: "Book lookup is unavailable. Try again later or add manually." }
  }
  try {
    const exact = exactItems.filter(item => item.id && item.volumeInfo?.industryIdentifiers?.some((id: any) => typeof id.identifier === "string" && sameISBN(isbn, id.identifier)))
    if (!exact.length) {
      // Google has no record of this ISBN. Try the free Open Library record before giving up.
      const ol = await openLibraryByISBN(isbn)
      return ol ? { ok: true, book: ol } : { ok: false, error: "No match for this ISBN. Search by title or add manually." }
    }
    const seed = mapBook(exact[0])
    if (matchingEditions(seed, exact.map(mapBook)).length !== exact.length) return { ok: false, error: "This ISBN returned conflicting book details. Search by title or add manually." }
    if (!matchingEditions(seed, [seed]).length) return { ok: false, error: "This ISBN has incomplete book details. Search by title or add manually." }
    const clean = (text: string) => text.replace(/["\\]/g, " ")
    const items = await lookup(`intitle:"${clean(seed.title.split(":")[0])}" inauthor:"${clean(seed.author)}"`)
    const language = exact[0].volumeInfo?.language
    const candidates = matchingEditions(seed, items.filter(item => item.id && (!language || item.volumeInfo?.language === language)).map(mapBook))
    if (!candidates.length) return { ok: false, error: "Could not confirm the latest edition. Search by title or try again later." }
    // Keep the identified record in the candidates. Select editions using the existing search policy.
    const all = [seed, ...candidates]
    const best = all.reduce((a, b) => isNewerEdition(b, a, Number(!!b.description), Number(!!a.description)) ? b : a)
    return { ok: true, book: best }
  } catch {
    return { ok: false, error: "Book lookup is unavailable. Try again later or add manually." }
  }
}
