// Runs in the browser (client-side) so Google Books sees the same key path as normal search.

// Fetches candidate books for the personalised Discover rows. The row logic (who qualifies, library
// filtering, dedupe, minimum size) lives in lib/discover-rows.ts. This only talks to Google Books and
// never writes anything.
type Spec = { key: string; kind: "author" | "rated" | "genre"; author?: string; seedTitle?: string; seedAuthor?: string; seedGenre?: string; genre?: string }
type Cand = { id: string; title: string; author: string; cover: string; description?: string; publishedYear?: number; genre?: string }

const norm = (v: string) => (v || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const base = (v: string) => norm(String(v || "").split(":")[0].replace(/\([^)]*\)/g, "")).replace(/^(the|a|an) /, "")
const JUNK = /\b(summary|study guide|analysis|workbook|box set|boxed set|collection|omnibus|companion|sparknotes|cliffsnotes|trivia|journal|notebook|coloring|colouring|screenplay|criticism|essays on|conversations with|reader's guide|large print)\b/i

const cache = new Map<string, any[]>()
const GB_TRIES = 6

// Free fallback used only when Google Books keeps failing: Open Library search, mapped to the same item shape.
// Rows still need a cover, so books without one are dropped later by toCand, same as with Google.
async function openLibrary(params: Record<string, string>): Promise<any[]> {
  try {
    const q = params.q || ""
    const author = q.match(/inauthor:"([^"]+)"/)?.[1], title = q.match(/intitle:"([^"]+)"/)?.[1], subject = q.match(/subject:"([^"]+)"/)?.[1]
    if (!author && !title && !subject) return []
    const limit = Math.min(Number(params.maxResults) || 20, 40), offset = Number(params.startIndex) || 0
    const u = new URLSearchParams({ limit: String(limit), offset: String(offset), language: "eng", fields: "key,title,author_name,cover_i,first_publish_year,subject,ratings_count,edition_count" })
    if (author) u.set("author", author); if (title) u.set("title", title); if (subject) u.set("subject", subject)
    const res = await fetch(`https://openlibrary.org/search.json?${u}`, { cache: "no-store", signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data.docs) ? data.docs : []).map((d: any) => ({
      id: `ol:${d.key}`,
      volumeInfo: {
        title: d.title, authors: d.author_name, language: "en", ratingsCount: d.ratings_count || 0,
        publishedDate: d.first_publish_year ? String(d.first_publish_year) : undefined,
        categories: Array.isArray(d.subject) && d.subject[0] ? [String(d.subject[0])] : undefined,
        imageLinks: d.cover_i ? { thumbnail: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` } : undefined,
      },
    })).filter((x: any) => x.volumeInfo.title && Array.isArray(x.volumeInfo.authors) && x.volumeInfo.authors.length)
  } catch { return [] }
}

async function gbooks(params: Record<string, string>): Promise<any[]> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
  const url = `https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({ ...params, langRestrict: "en", printType: "books", ...(key ? { key } : {}) })}`
  const ck = JSON.stringify(params)
  const hit = cache.get(ck); if (hit) return hit
  let lastStatus = "none"
  // Google Books answers 503 at random. Retry with a growing wait before giving up.
  for (let a = 0; a < GB_TRIES; a++) {
    try {
      const res = await fetch(url, { cache: "no-store" })
      lastStatus = String(res.status)
      if (res.ok) {
        const data = await res.json(); const items = Array.isArray(data.items) ? data.items : []
        cache.set(ck, items); return items
      }
      if (res.status !== 429 && res.status < 500) break
    } catch (e) { lastStatus = e instanceof Error ? e.message : String(e) }
    if (a < GB_TRIES - 1) await new Promise(r => setTimeout(r, 500 * (a + 1)))
  }
  const ol = await openLibrary(params)
  if (ol.length) cache.set(ck, ol)
  return ol
}

function secure(u: string) { return (u || "").replace(/^http:\/\//, "https://").replace("&edge=curl", "") }

function toCand(it: any): Cand | null {
  const v = it?.volumeInfo || {}
  const cover = secure(v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || "")
  const author = (v.authors || [])[0] || ""
  if (!v.title || !author || !cover || (v.language && v.language !== "en")) return null
  if (JUNK.test(v.title) || (v.pageCount && v.pageCount < 80)) return null
  const year = Number.parseInt(String(v.publishedDate || "").slice(0, 4)) || undefined
  return { id: it.id, title: String(v.title), author, cover, description: v.description ? String(v.description).slice(0, 600) : undefined, publishedYear: year, genre: (v.categories || [])[0] }
}

// One entry per book (title+author), newest edition with a cover wins. Order of first appearance is kept.
function oneEach(items: any[], wantAuthor?: string): Cand[] {
  const words = wantAuthor ? norm(wantAuthor).split(" ").filter(w => w.length > 2) : []
  const best = new Map<string, { c: Cand; pop: number }>(), order: string[] = []
  for (const it of items) {
    const v = it?.volumeInfo || {}
    if (words.length && !words.every(w => norm((v.authors || []).join(" ")).includes(w))) continue
    const c = toCand(it); if (!c) continue
    const k = `${base(c.title)}|${norm(c.author).split(" ").slice(-1)[0]}`
    const pop = Number(v.ratingsCount) || 0
    const prev = best.get(k)
    if (!prev) { best.set(k, { c, pop }); order.push(k) }
    else if ((c.publishedYear || 0) > (prev.c.publishedYear || 0)) best.set(k, { c, pop: Math.max(pop, prev.pop) })
    else prev.pop = Math.max(prev.pop, pop)
  }
  return order.map(k => ({ ...best.get(k)!.c, _pop: best.get(k)!.pop } as Cand & { _pop: number }))
}

const popular = (list: Cand[]) => [...list].sort((a: any, b: any) => (b._pop || 0) - (a._pop || 0)).map(({ ...c }: any) => { delete c._pop; return c as Cand })
const stripPop = (list: Cand[]) => list.map(({ ...c }: any) => { delete c._pop; return c as Cand })
const GENERIC = /^(fiction|general|juvenile fiction|juvenile nonfiction|nonfiction|literary collections|young adult fiction|biography & autobiography)$/i

async function seedCategories(title: string, author: string): Promise<string[]> {
  const items = await gbooks({ q: `intitle:"${title.replace(/"/g, "")}" inauthor:"${author.replace(/"/g, "")}"`, maxResults: "10" })
  const cats: string[] = []
  for (const it of items) for (const c of it?.volumeInfo?.categories || []) for (const part of String(c).split("/")) { const p = part.trim(); if (p && !GENERIC.test(p) && !cats.includes(p)) cats.push(p) }
  return cats
}

async function pagesOL(q: string, n = 2): Promise<any[]> {
  const all: any[] = []
  for (let i = 0; i < n; i++) all.push(...await openLibrary({ q, maxResults: "40", startIndex: String(i * 40) }))
  return all
}

async function pages(q: string, n = 2): Promise<any[]> {
  const all: any[] = []
  for (let i = 0; i < n; i++) all.push(...await gbooks({ q, maxResults: "40", startIndex: String(i * 40) }))
  return all
}

// Google can answer 200 with too few usable books (or none) while it is unhealthy. Below this many, ask Open Library too.
const THIN = 8

async function candidatesFrom(s: Spec, fetchPages: (q: string, n?: number) => Promise<any[]>): Promise<Cand[]> {
  if (s.kind === "author" && s.author) return stripPop(oneEach(await fetchPages(`inauthor:"${s.author.replace(/"/g, "")}"`), s.author))
  if (s.kind === "rated" && s.seedTitle && s.seedAuthor) {
    const cats = await seedCategories(s.seedTitle, s.seedAuthor)
    const subject = cats[0] || s.seedGenre
    if (!subject) return []
    return popular(oneEach(await fetchPages(`subject:"${subject.replace(/"/g, "")}"`)))
  }
  if (s.kind === "genre" && s.genre) return popular(oneEach(await fetchPages(`subject:"${s.genre.replace(/"/g, "")}"`)))
  return []
}

async function candidatesFor(s: Spec): Promise<Cand[]> {
  let list = await candidatesFrom(s, pages)
  if (list.length < THIN) {
    const more = await candidatesFrom(s, pagesOL)
    const seen = new Set(list.map(c => `${base(c.title)}|${norm(c.author).split(" ").slice(-1)[0]}`))
    list = [...list, ...more.filter(c => !seen.has(`${base(c.title)}|${norm(c.author).split(" ").slice(-1)[0]}`))]
  }
  return list
}

export async function fetchDiscoverCandidates(specs: Spec[], onSpec?: (key: string, list: Cand[]) => void): Promise<Record<string, Cand[]>> {
  const out: Record<string, Cand[]> = {}
  const list = (Array.isArray(specs) ? specs : []).slice(0, 6)
  await Promise.all(list.map(async s => { try { out[String(s.key)] = (await candidatesFor(s)).slice(0, 60) } catch { out[String(s.key)] = [] }; try { onSpec?.(String(s.key), out[String(s.key)]) } catch {} }))
  return out
}
