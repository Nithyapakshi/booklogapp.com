"use server"
import { createClient } from "@supabase/supabase-js"
import { similarity } from "@/lib/book-enrichment"
import { plausiblePageCount } from "@/lib/reading-progress"

// Total pages for one of the signed-in reader's own books, from public data: Google Books first
// (by volume id, else by title and author), then Open Library. Read-only and best effort:
// returns null when nothing trustworthy is found, and the reader can type a total instead.
const GOOGLE_ID = /^[A-Za-z0-9_-]{12}$/

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

// Compares main titles only (subtitles and bracketed edition notes vary between listings).
const base = (s: string) => s.split(":")[0].replace(/\([^)]*\)/g, " ").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const close = (a: string, b: string) => similarity(base(a), base(b)) >= 0.85

export async function lookupOwnPageCount(accessToken: string, bookId: string): Promise<number | null> {
  if (!accessToken || accessToken.length > 10000 || !bookId || bookId.length > 200) return null
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } })
  const { data: auth, error: authError } = await db.auth.getUser(accessToken)
  if (authError || !auth.user) return null
  const { data, error } = await db.from("books").select("title,author").eq("user_id", auth.user.id).eq("id", bookId).limit(1)
  if (error || !data?.length) return null
  const { title, author } = data[0] as { title: string; author: string }
  const key = process.env.GOOGLE_BOOKS_SERVER_KEY ? `&key=${process.env.GOOGLE_BOOKS_SERVER_KEY}` : ""

  if (GOOGLE_ID.test(bookId)) {
    const v = await getJson(`https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(bookId)}?fields=volumeInfo(title,pageCount)${key}`)
    const n = plausiblePageCount(v?.volumeInfo?.pageCount)
    if (n) return n
  }
  const q = encodeURIComponent(`intitle:${title}${author && !/unknown/i.test(author) ? ` inauthor:${author}` : ""}`)
  const found = await getJson(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=10&fields=items(volumeInfo(title,pageCount))${key}`)
  for (const item of found?.items || []) {
    const n = plausiblePageCount(item?.volumeInfo?.pageCount)
    if (n && close(item.volumeInfo.title || "", title)) return n
  }
  const ol = await getJson(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}${author && !/unknown/i.test(author) ? `&author=${encodeURIComponent(author)}` : ""}&fields=title,number_of_pages_median&limit=5`)
  for (const doc of ol?.docs || []) {
    const n = plausiblePageCount(doc?.number_of_pages_median)
    if (n && close(doc.title || "", title)) return n
  }
  return null
}
