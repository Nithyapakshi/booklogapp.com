// Personalised Discover rows. Pure logic only (no network): row specs from the library, candidate filtering,
// "each book once", small same-spirit rows, dismissals. Candidates are fetched by app/actions/discover-rows.ts.

export const ROW_SIZE = 15
export const MIN_ROW_BOOKS = 4

export interface LibBook { id?: string; title: string; author: string; status?: string; selfRating?: number; genre?: string }
export interface Candidate { id: string; title: string; author: string; cover: string; description?: string; publishedYear?: number; genre?: string; relevanceScore?: number; relevanceSource?: string }
export type RowKind = "author" | "rated" | "genre"
export interface RowSpec { key: string; kind: RowKind; title: string; subtitle: string; reason: string; author?: string; seedTitle?: string; seedAuthor?: string; seedGenre?: string; genre?: string }
export interface DiscoverRow { key: string; title: string; subtitle: string; reason: string; books: Candidate[] }
export interface Dismissed { key: string; author: string }

const clean = (v: string) => (v || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
export const baseTitle = (v: string) => clean(String(v || "").split(":")[0].replace(/\([^)]*\)/g, "")).replace(/^(the|a|an) /, "")
const authorWords = (v: string) => clean(v).split(" ").filter(w => w.length > 1 && w !== "unknown" && w !== "author")
export const bookKey = (title: string, author: string) => `${baseTitle(title)}|${authorWords(author).slice(-1)[0] || ""}`
const authorKey = (a: string) => authorWords(a).join(" ")

function uniqueLibrary(books: LibBook[]): LibBook[] {
  const seen = new Set<string>(), out: LibBook[] = []
  for (const b of books) {
    const k = bookKey(b.title, b.author)
    if (seen.has(k)) { // same book on two lists: keep the richest info (rating, genre)
      const prev = out.find(o => bookKey(o.title, o.author) === k)!
      if (!prev.selfRating && b.selfRating) prev.selfRating = b.selfRating
      if (!prev.genre && b.genre) prev.genre = b.genre
      if (b.status === "completed" || b.status === "reading") prev.status = prev.status === "completed" ? prev.status : b.status
      continue
    }
    seen.add(k); out.push({ ...b })
  }
  return out
}

export function primaryGenre(g?: string): string {
  const first = String(g || "").split(/[\/,;]/)[0].trim()
  return first && !/^(general|unknown|n\/a)$/i.test(first) ? first.replace(/^./, c => c.toUpperCase()) : ""
}

export function buildRowSpecs(rawBooks: LibBook[], opts: { maxAuthorRows?: number; maxRatedRows?: number } = {}): RowSpec[] {
  const books = uniqueLibrary(rawBooks.filter(b => b.title && b.title.trim()))
  const specs: RowSpec[] = []
  // 1. Most-read authors (Completed + Currently Reading). Needs at least 2 books by the author.
  const counts = new Map<string, { n: number; name: string }>()
  for (const b of books) {
    if (b.status !== "completed" && b.status !== "reading") continue
    const k = authorKey(b.author); if (!k) continue
    const c = counts.get(k) || { n: 0, name: b.author.trim() }; c.n += 1; counts.set(k, c)
  }
  const authors = [...counts.values()].filter(c => c.n >= 2).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, opts.maxAuthorRows ?? 2)
  for (const a of authors) specs.push({ key: `author:${authorKey(a.name)}`, kind: "author", author: a.name, title: `Since you've read ${a.n} books by ${a.name}`, subtitle: "More from an author you read a lot", reason: `You've read ${a.n} books by ${a.name}.` })
  // 2. 5-star books
  const fives = books.filter(b => b.selfRating === 5).sort((a, b) => a.title.localeCompare(b.title)).slice(0, opts.maxRatedRows ?? 2)
  for (const b of fives) specs.push({ key: `rated:${bookKey(b.title, b.author)}`, kind: "rated", seedTitle: b.title, seedAuthor: b.author, seedGenre: primaryGenre(b.genre), title: `Because you rated ${b.title} 5 stars`, subtitle: "In the same spirit", reason: `You rated ${b.title} 5 stars.` })
  // 3. Biggest genre, real share of the library
  const g = new Map<string, number>(); let withGenre = 0
  for (const b of books) { const p = primaryGenre(b.genre); if (p) { g.set(p, (g.get(p) || 0) + 1); withGenre++ } }
  if (withGenre >= 5) {
    const [name, n] = [...g.entries()].sort((a, b) => b[1] - a[1])[0]
    const pct = Math.round((n / withGenre) * 100)
    if (pct >= 40) specs.push({ key: `genre:${clean(name)}`, kind: "genre", genre: name, title: `Because ${pct}% of your library is ${name}`, subtitle: "Your biggest shelf", reason: `${pct}% of your library is ${name}.` })
  }
  return specs
}

export function libraryHasBook(c: { id?: string; title: string; author: string }, library: LibBook[]): boolean {
  const k = bookKey(c.title, c.author), t = baseTitle(c.title), words = authorWords(c.author)
  return library.some(b => (!!c.id && !!b.id && c.id === b.id) || bookKey(b.title, b.author) === k ||
    (baseTitle(b.title) === t && (words.length === 0 || authorWords(b.author).length === 0 || words.some(w => authorWords(b.author).includes(w)))))
}

export function loadDismissals(raw: string | null): Dismissed[] {
  try { const v = JSON.parse(raw || "[]"); return Array.isArray(v) ? v.filter((d: any) => d && typeof d.key === "string").map((d: any) => ({ key: d.key, author: String(d.author || "") })) : [] } catch { return [] }
}
// Dismissing 3+ books by one author drops that author from every row.
export function blockedAuthors(dismissed: Dismissed[]): Set<string> {
  const n = new Map<string, number>()
  for (const d of dismissed) { const k = authorKey(d.author); if (k) n.set(k, (n.get(k) || 0) + 1) }
  return new Set([...n.entries()].filter(([, c]) => c >= 3).map(([k]) => k))
}

export function assembleRows(specs: RowSpec[], candidates: Record<string, Candidate[]>, library: LibBook[], dismissed: Dismissed[], extraSeen: string[] = []): DiscoverRow[] {
  const gone = new Set(dismissed.map(d => d.key)); const blocked = blockedAuthors(dismissed)
  const used = new Set<string>(extraSeen); const rows: DiscoverRow[] = []
  for (const s of specs) {
    const picked: Candidate[] = []
    const ordered = s.kind === "rated" ? [...(candidates[s.key] || [])].sort((a,b)=>(b.relevanceScore || 0)-(a.relevanceScore || 0)) : candidates[s.key] || []
    for (const c of ordered) {
      const k = bookKey(c.title, c.author)
      if (!c.cover || !c.title || used.has(k) || gone.has(k) || libraryHasBook(c, library)) continue
      if (blocked.has(authorKey(c.author))) continue
      if (s.kind === "rated" && s.seedAuthor && authorKey(c.author) === authorKey(s.seedAuthor)) continue
      picked.push(c); used.add(k)
      if (picked.length >= ROW_SIZE) break
    }
    // Books that did not make the row go back to the pool for later rows.
    if (picked.length < (s.kind === "rated" ? 5 : MIN_ROW_BOOKS)) { picked.forEach(c => used.delete(bookKey(c.title, c.author))); continue }
    rows.push({ key: s.key, title: s.title, subtitle: s.subtitle, reason: s.reason, books: picked })
  }
  return rows
}

// Mobile "Top pick": the first book of the first row that still keeps the minimum without it.
export function takeTopPick(rows: DiscoverRow[]): { pick: (Candidate & { reason: string }) | null; rows: DiscoverRow[] } {
  const i = rows.findIndex(r => !r.key.startsWith("rated:") && r.books.length > MIN_ROW_BOOKS)
  if (i < 0) return { pick: null, rows }
  const r = rows[i]
  return { pick: { ...r.books[0], reason: r.reason }, rows: rows.map((x, j) => j === i ? { ...x, books: x.books.slice(1) } : x) }
}

export function specsSignature(specs: RowSpec[]): string {
  return "spirit-paid20-min5-v1|" + specs.map(s => [s.key, s.title, s.seedGenre || "", s.genre || ""].join("~")).join("||")
}
