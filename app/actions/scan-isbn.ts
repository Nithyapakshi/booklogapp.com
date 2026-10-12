"use server"

import { validBookISBN, sameISBN, matchingEditions } from "@/lib/isbn"
import { isNewerEdition, normaliseGenre, type BookSearchResult } from "@/lib/google-books-api"

export type ISBNLookup = { ok: true; book: BookSearchResult } | { ok: false; error: string }

async function lookup(query: string): Promise<any[]> {
  const key = process.env.GOOGLE_BOOKS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
  const params = new URLSearchParams({ q: query, maxResults: "40", printType: "books", orderBy: "relevance" })
  if (key) params.set("key", key)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { cache: "no-store", signal: AbortSignal.timeout(10000) })
      if (res.ok) { const data = await res.json(); return Array.isArray(data.items) ? data.items : [] }
      if (res.status !== 429 && res.status < 500) throw new Error("Lookup unavailable")
    } catch { if (attempt === 2) throw new Error("Lookup unavailable") }
    if (attempt < 2) await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
  }
  throw new Error("Lookup unavailable")
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
  try {
    const exact = (await lookup(`isbn:${isbn}`)).filter(item => item.id && item.volumeInfo?.industryIdentifiers?.some((id: any) => typeof id.identifier === "string" && sameISBN(isbn, id.identifier)))
    if (!exact.length) return { ok: false, error: "No match for this ISBN. Search by title or add manually." }
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
