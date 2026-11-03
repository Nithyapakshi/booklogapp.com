// Runs a planned Goodreads import for the signed-in reader.
// Safety rules:
// - Only ever ADDS books. Books already in the library are left exactly as they are.
// - Each book is saved through the same save_book_details function as Add manually, which re-checks duplicates in the database.
// - The import itself looks up covers on Open Library only, never Google Books, so it cannot use up the Google quota
//   that live search depends on. Books still without a cover are filled later by the existing, rate-limited cover healing.
// - Safe to re-run: books already imported are skipped.
// - One import at a time per browser tab; its progress survives navigating away and back within the app.
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { nearDuplicate } from "@/lib/book-identity"
import { normaliseGenre } from "@/lib/google-books-api"
import { planImport as planPure, type ImportBook, type ImportPlan } from "@/lib/goodreads-import"

// The library loader reads up to 1000 rows per reader, so an import must not push a library past that.
export const LIBRARY_ROW_LIMIT = 1000
const CONCURRENCY = 3

export type { ImportPlan }
export type ImportOutcome = { imported: number; alreadyInLibrary: number; failed: string[]; partial: string[]; stopped: boolean }
export type ImportState = { kind: "running"; done: number; total: number } | { kind: "finished"; outcome: ImportOutcome }

export function planImport(books: ImportBook[], library: { id?: string; title: string; author: string }[]): ImportPlan {
  return planPure(books, library, nearDuplicate)
}

// Module-level so a running import outlives the Settings screen.
let state: ImportState | null = null
let stopRequested = false
const listeners = new Set<(s: ImportState | null) => void>()
function publish(next: ImportState | null) { state = next; listeners.forEach(l => l(next)) }
export function currentImport() { return state }
export function subscribeImport(l: (s: ImportState | null) => void) { listeners.add(l); return () => { listeners.delete(l) } }
export function clearFinishedImport() { if (state?.kind === "finished") publish(null) }
export function stopImport() { stopRequested = true }

async function getJson(url: string): Promise<any> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) })
    return res.ok ? await res.json() : null
  } catch { return null }
}

// Best effort: a cover and genre from Open Library. Never throws; returns blanks when nothing is found.
async function lookupDetails(b: ImportBook): Promise<{ cover: string; genre: string | null }> {
  const isbn = b.isbn13 || b.isbn10
  if (isbn) {
    const d = (await getJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`))?.[`ISBN:${isbn}`]
    const cover = String(d?.cover?.medium || d?.cover?.large || "").replace(/^http:/, "https:")
    if (cover) {
      const subjects = Array.isArray(d.subjects) ? d.subjects.map((s: any) => s?.name).filter(Boolean) : []
      return { cover, genre: subjects.length ? normaliseGenre(subjects.slice(0, 1)) : null }
    }
  }
  const q = new URLSearchParams({ title: b.title.split(":")[0], author: b.author, limit: "1", fields: "cover_i,subject" })
  const found = (await getJson(`https://openlibrary.org/search.json?${q}`))?.docs?.[0]
  return {
    cover: found?.cover_i ? `https://covers.openlibrary.org/b/id/${found.cover_i}-M.jpg` : "",
    genre: Array.isArray(found?.subject) && found.subject.length ? normaliseGenre(found.subject.slice(0, 1)) : null,
  }
}

// "added" (everything saved), "partial" (book saved, but its read date or note was not), or "duplicate".
async function saveOne(b: ImportBook, userId: string): Promise<"added" | "partial" | "duplicate"> {
  const supabase = createClientSupabaseClient()
  const { cover, genre } = await lookupDetails(b)
  const { data, error } = await supabase.rpc("save_book_details", {
    p_id: crypto.randomUUID(), p_title: b.title, p_author: b.author, p_cover: cover, p_edit: false, p_status: b.status,
    p_genre: genre, p_description: null, p_year: b.publishedYear, p_rating: b.rating,
  })
  if (error) throw error
  if (data?.outcome === "duplicate") return "duplicate"
  const id = data?.books?.[0]?.id
  if (data?.outcome !== "added" || !id) throw new Error("not saved")
  // Extras only ever touch the book just created (new random id).
  let complete = true
  if (b.finishedAt) {
    const r = await supabase.from("books").update({ finished_at: b.finishedAt, finished_precision: "day" })
      .eq("user_id", userId).eq("id", id).eq("status", "completed").select("id")
    if (r.error || !r.data?.length) complete = false
  }
  if (b.notes) {
    const r = await supabase.from("book_notes").upsert({ user_id: userId, book_id: id, notes: b.notes, updated_at: new Date().toISOString() }).select("book_id")
    if (r.error || !r.data?.length) complete = false
  }
  return complete ? "added" : "partial"
}

export async function runImport(plan: ImportPlan, userId: string, onFinished: () => void): Promise<ImportOutcome | null> {
  if (state?.kind === "running") return null
  stopRequested = false
  const outcome: ImportOutcome = { imported: 0, alreadyInLibrary: plan.alreadyInLibrary, failed: [], partial: [], stopped: false }
  const queue = [...plan.toImport]
  const total = queue.length
  let done = 0
  publish({ kind: "running", done, total })
  async function worker() {
    for (let b = queue.shift(); b; b = queue.shift()) {
      if (stopRequested) { outcome.stopped = true; queue.length = 0; break }
      try {
        const result = await saveOne(b, userId)
        if (result === "duplicate") outcome.alreadyInLibrary++
        else outcome.imported++
        if (result === "partial") outcome.partial.push(b.title)
      } catch {
        outcome.failed.push(b.title)
      }
      publish({ kind: "running", done: ++done, total })
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))
  } finally {
    publish({ kind: "finished", outcome })
    onFinished()
  }
  return outcome
}
