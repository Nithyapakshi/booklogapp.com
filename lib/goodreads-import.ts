// Goodreads library import: pure parsing and mapping only (no network, no database), so it is fully unit-tested.
// Input is the CSV from Goodreads > My Books > Import and export > Export Library.

export type ImportStatus = "reading" | "queued" | "completed" | "onHold"

export type ImportBook = {
  title: string
  author: string
  isbn13: string
  isbn10: string
  status: ImportStatus
  rating: number | null
  finishedAt: string | null
  notes: string
  publishedYear: number | null
}

export type ParseResult =
  | { ok: true; books: ImportBook[]; skippedRows: number }
  | { ok: false; error: string }

// Most libraries fit comfortably; the cap keeps one import bounded.
export const MAX_IMPORT_BOOKS = 1000

// RFC 4180 CSV: quoted fields may hold commas, doubled quotes and line breaks. Accepts CRLF/LF and a leading BOM.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const s = text.replace(/^﻿/, "")
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++
      row.push(field); rows.push(row); row = []; field = ""
    } else field += c
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(v => v.trim() !== ""))
}

export const collapseSpaces = (v: string) => (v || "").replace(/\s+/g, " ").trim()

// Goodreads wraps ISBNs as ="9780812993011" so spreadsheets keep leading zeros. Keep digits (and a final X) only.
export function cleanIsbn(value: string): string {
  const v = (value || "").toUpperCase().replace(/[^0-9X]/g, "")
  return v.length === 13 && /^\d{13}$/.test(v) ? v : v.length === 10 && /^\d{9}[\dX]$/.test(v) ? v : ""
}

// "Harry Potter and the Sorcerer's Stone (Harry Potter, #1)" -> "Harry Potter and the Sorcerer's Stone"
export function cleanTitle(value: string): string {
  return collapseSpaces(collapseSpaces(value).replace(/\s*\([^()]*#\s*[\d.]+[^()]*\)\s*$/, ""))
}

export function shelfToStatus(shelf: string): ImportStatus {
  const s = (shelf || "").trim().toLowerCase()
  if (s === "read") return "completed"
  if (s === "currently-reading") return "reading"
  if (s === "to-read") return "queued"
  return "onHold"
}

// Goodreads "0" means not rated.
export function cleanRating(value: string): number | null {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null
}

// "2021/05/18" -> "2021-05-18". Rejects impossible or future dates.
export function cleanDate(value: string, today: string): string | null {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec((value || "").trim())
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 1000) return null
  const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`
  return iso > today ? null : iso
}

// Goodreads reviews are light HTML. Keep the words and line breaks, drop the markup.
export function htmlToText(value: string): string {
  return (value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
}

function cleanYear(...values: string[]): number | null {
  for (const v of values) {
    const n = Number((v || "").trim())
    if (Number.isInteger(n) && n > 0 && n <= 9999) return n
  }
  return null
}

const REQUIRED = ["Title", "Author", "Exclusive Shelf"]

export function parseGoodreadsCsv(text: string, today: string): ParseResult {
  const rows = parseCsv(text || "")
  if (rows.length === 0) return { ok: false, error: "This file is empty." }
  const header = rows[0].map(h => h.trim())
  const col = (name: string) => header.indexOf(name)
  if (REQUIRED.some(h => col(h) < 0)) return { ok: false, error: "This doesn't look like a Goodreads export. Use the file from Goodreads > My Books > Import and export > Export Library." }
  const get = (r: string[], name: string) => { const i = col(name); return i >= 0 ? r[i] ?? "" : "" }
  const books: ImportBook[] = []
  let skippedRows = 0
  for (const r of rows.slice(1)) {
    const title = cleanTitle(get(r, "Title"))
    const author = collapseSpaces(get(r, "Author"))
    if (!title || !author || title.length > 500 || author.length > 500) { skippedRows++; continue }
    const status = shelfToStatus(get(r, "Exclusive Shelf"))
    const notes = [htmlToText(get(r, "My Review")), htmlToText(get(r, "Private Notes"))].filter(Boolean).join("\n\n")
    books.push({
      title, author,
      isbn13: cleanIsbn(get(r, "ISBN13")),
      isbn10: cleanIsbn(get(r, "ISBN")),
      status,
      rating: cleanRating(get(r, "My Rating")),
      finishedAt: status === "completed" ? cleanDate(get(r, "Date Read"), today) : null,
      notes,
      publishedYear: cleanYear(get(r, "Original Publication Year"), get(r, "Year Published")),
    })
  }
  if (books.length === 0) return { ok: false, error: "We couldn't find any books in this file." }
  if (books.length > MAX_IMPORT_BOOKS) return { ok: false, error: `This file has ${books.length} books. BookLog can import up to ${MAX_IMPORT_BOOKS} at a time.` }
  return { ok: true, books, skippedRows }
}

export function countByStatus(books: ImportBook[]): Record<ImportStatus, number> {
  const out: Record<ImportStatus, number> = { reading: 0, queued: 0, completed: 0, onHold: 0 }
  for (const b of books) out[b.status]++
  return out
}

export type ImportPlan = { toImport: ImportBook[]; alreadyInLibrary: number }
type LibraryBook = { id?: string; title: string; author: string }

// A book counts as already present when it matches the library (or an earlier row in the same file)
// exactly or as a near match. `isNear` is lib/book-identity's nearDuplicate, injected to keep this file pure.
export function planImport(books: ImportBook[], library: LibraryBook[], isNear: (b: LibraryBook, list: LibraryBook[]) => unknown): ImportPlan {
  const seen: LibraryBook[] = [...library]
  const key = (b: LibraryBook) => `${collapseSpaces(b.title).toLowerCase()}\u0000${collapseSpaces(b.author).toLowerCase()}`
  const exact = new Set(seen.map(key))
  const toImport: ImportBook[] = []
  let alreadyInLibrary = 0
  for (const b of books) {
    if (exact.has(key(b)) || isNear(b, seen)) { alreadyInLibrary++; continue }
    seen.push(b)
    exact.add(key(b))
    toImport.push(b)
  }
  return { toImport, alreadyInLibrary }
}
