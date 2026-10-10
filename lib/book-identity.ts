export function normalizeBookText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase()
}
export function sameBook(a: {id?: string; title: string; author: string}, b: {id?: string; title: string; author: string}): boolean {
  return Boolean(a.id && b.id && a.id === b.id) ||
    (normalizeBookText(a.title) === normalizeBookText(b.title) && normalizeBookText(a.author) === normalizeBookText(b.author))
}
export function validateBookDetails(title: string, author: string, cover: string): string | null {
  if (!title.trim() || !author.trim()) return "Enter a title and author."
  if (title.trim().length > 500 || author.trim().length > 500) return "Title and author must each be 500 characters or fewer."
  if (cover.trim()) {
    try { const url = new URL(cover.trim()); if (!["http:", "https:"].includes(url.protocol)) return "Use an http or https cover URL." }
    catch { return "Enter a valid cover URL, or leave it blank." }
    if (cover.trim().length > 2048) return "Cover URL must be 2048 characters or fewer."
  }
  return null
}
