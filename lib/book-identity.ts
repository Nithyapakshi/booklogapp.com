export function normalizeBookText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase()
}
export function sameBook(a: {id?: string; title: string; author: string}, b: {id?: string; title: string; author: string}): boolean {
  return Boolean(a.id && b.id && a.id === b.id) ||
    (normalizeBookText(a.title) === normalizeBookText(b.title) && normalizeBookText(a.author) === normalizeBookText(b.author))
}
export function validateBookDetails(title: string, author: string, cover: string): string | null {
  if (!title.trim()) return "Enter a title."
  if (title.trim().length > 500 || author.trim().length > 500) return "Title and author must each be 500 characters or fewer."
  if (cover.trim()) {
    try { const url = new URL(cover.trim()); if (!["http:", "https:"].includes(url.protocol)) return "Use an http or https cover URL." }
    catch { return "Enter a valid cover URL, or leave it blank." }
    if (cover.trim().length > 2048) return "Cover URL must be 2048 characters or fewer."
  }
  return null
}

// Looser than sameBook: same work under a different spelling. "Hobbit" vs "The Hobbit", "Tolkien, J.R.R." vs
// "J.R.R. Tolkien", a subtitle or edition suffix, or an unknown author. Used only to WARN before adding,
// never to block, because two books can genuinely share a title.
const looseText = (v: string) => (v || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const looseTitle = (v: string) => looseText(String(v || "").split(":")[0].replace(/\([^)]*\)/g, "")).replace(/^(the|a|an) /, "")
const authorWords = (v: string) => looseText(v).split(" ").filter(w => w.length > 2 && w !== "unknown" && w !== "author")
export function nearDuplicate<T extends {id?: string; title: string; author: string}>(candidate: {id?: string; title: string; author: string}, library: T[]): T | null {
  const title = looseTitle(candidate.title)
  if (!title) return null
  const wanted = authorWords(candidate.author)
  for (const book of library) {
    if (sameBook(candidate, book) || looseTitle(book.title) !== title) continue
    const have = authorWords(book.author)
    if (!wanted.length || !have.length || wanted.some(w => have.includes(w))) return book
  }
  return null
}
