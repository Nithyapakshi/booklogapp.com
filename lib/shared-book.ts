import { sameBook } from "@/lib/book-identity"
import { searchBooks, getBookById } from "@/lib/google-books-api"

// Public snapshot only. Never attach a library Book (it may contain notes/rating).
export type SharedSnapshot = { display_name: string; title: string; author: string; cover: string }
export type SharedCatalog = { description: string; cover: string }
export const isShareToken = (token: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
export function safeCover(value: string | undefined): string {
  if (!value) return ""
  try { const u = new URL(value); return u.protocol === "https:" ? u.href : "" } catch { return "" }
}
// Reuse the Add Book search + detail pipeline, including its cleaning/fallbacks.
// Legacy snapshots contain no catalog ID, so never take a merely fuzzy title match.
export async function catalogForShare(book: Pick<SharedSnapshot, "title" | "author" | "cover">, apiKey?: string): Promise<SharedCatalog> {
  const empty = { description: "", cover: safeCover(book.cover) }
  try {
    const results = await searchBooks(book.title, apiKey)
    const match = results.find(item => sameBook(item, book))
    if (!match) return empty
    const full = await getBookById(match.id, apiKey)
    const selected = full && sameBook(full, book) ? full : match
    return { description: selected.description || "", cover: safeCover(book.cover) || safeCover(selected.cover?.replace(/^http:\/\//, "https://")) }
  } catch { return empty }
}
