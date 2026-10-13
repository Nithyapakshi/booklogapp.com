"use server"

// Fetches candidate books for the personalised Discover rows. The row logic (who qualifies, library
// filtering, dedupe, minimum size) lives in lib/discover-rows.ts. This only talks to Google Books and
// never writes anything.
type Spec = { key: string; kind: "author" | "rated" | "genre"; author?: string; seedTitle?: string; seedAuthor?: string; seedGenre?: string; genre?: string }
type Cand = { id: string; title: string; author: string; cover: string; description?: string; publishedYear?: number; genre?: string }

const norm = (v: string) => (v || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const base = (v: string) => norm(String(v || "").split(":")[0].replace(/\([^)]*\)/g, "")).replace(/^(the|a|an) /, "")
const JUNK = /\b(summary|study guide|analysis|workbook|box set|boxed set|collection|omnibus|companion|sparknotes|cliffsnotes|trivia|journal|notebook|coloring|colouring|screenplay|criticism|essays on|conversations with|reader's guide|large print)\b/i

// Preview-only diagnostics (server log). Never active in production.
const DEBUG = process.env.VERCEL_ENV === "preview"

async function gbooks(params: Record<string, string>): Promise<any[]> {
  const key = process.env.GOOGLE_BOOKS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY
  const url = `https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({ ...params, langRestrict: "en", printType: "books", ...(key ? { key } : {}) })}`
  try {
    let res = await fetch(url, { cache: "no-store" })
    for (let a = 1; a < 4 && (res.status === 503 || res.status === 429 || res.status >= 500); a++) {
      await new Promise(r => setTimeout(r, 400 * a)); res = await fetch(url, { cache: "no-store" })
    }
    if (!res.ok) {
      if (DEBUG) console.error("DISCOVER_GB", res.status, key ? "keyed" : "no-key", params.q, (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200))
      return []
    }
    const data = await res.json()
    if (DEBUG) console.error("DISCOVER_GB", res.status, key ? "keyed" : "no-key", params.q, "items=" + (Array.isArray(data.items) ? data.items.length : 0))
    return Array.isArray(data.items) ? data.items : []
  } catch (e) { if (DEBUG) console.error("DISCOVER_GB threw", params.q, e instanceof Error ? e.message : String(e)); return [] }
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

async function pages(q: string, n = 2): Promise<any[]> {
  const all: any[] = []
  for (let i = 0; i < n; i++) all.push(...await gbooks({ q, maxResults: "40", startIndex: String(i * 40) }))
  return all
}

async function candidatesFor(s: Spec): Promise<Cand[]> {
  if (s.kind === "author" && s.author) return stripPop(oneEach(await pages(`inauthor:"${s.author.replace(/"/g, "")}"`), s.author))
  if (s.kind === "rated" && s.seedTitle && s.seedAuthor) {
    const cats = await seedCategories(s.seedTitle, s.seedAuthor)
    const subject = cats[0] || s.seedGenre
    if (!subject) return []
    return popular(oneEach(await pages(`subject:"${subject.replace(/"/g, "")}"`)))
  }
  if (s.kind === "genre" && s.genre) return popular(oneEach(await pages(`subject:"${s.genre.replace(/"/g, "")}"`)))
  return []
}

export async function fetchDiscoverCandidates(specs: Spec[]): Promise<Record<string, Cand[]>> {
  const out: Record<string, Cand[]> = {}
  const list = (Array.isArray(specs) ? specs : []).slice(0, 6)
  await Promise.all(list.map(async s => { try { out[String(s.key)] = (await candidatesFor(s)).slice(0, 60) } catch { out[String(s.key)] = [] } }))
  return out
}
