// CSV export of a reader's own library. Pure functions: no network, no app state.

export const CSV_COLUMNS = [
  "Title", "Author", "Status", "Date started", "Date finished", "My rating", "Genre", "Published year", "Notes",
] as const

const STATUS_LABELS: Record<string, string> = {
  reading: "Currently Reading",
  queued: "Want to Read",
  completed: "Completed",
  recommended: "My Recommendations",
  onHold: "On Hold",
}

export interface ExportBookRow {
  title?: string | null
  author?: string | null
  status?: string | null
  started_at?: string | null
  finished_at?: string | null
  self_rating?: number | null
  genre?: string | null
  published_year?: number | null
}

// Spreadsheet apps run a cell that starts with = + - @ as a formula. Text from a book title or a note must stay text.
export function csvCell(value: unknown, isText = true): string {
  let s = value === null || value === undefined ? "" : String(value)
  if (isText && /^[=+\-@\t\r]/.test(s)) s = "'" + s
  return '"' + s.replace(/"/g, '""') + '"'
}

export function buildLibraryCsv(rows: ExportBookRow[], notesByBook: Map<string, string>, idOf: (r: ExportBookRow) => string): string {
  const order = ["reading", "queued", "completed", "recommended", "onHold"]
  const sorted = [...rows].sort((a, b) => {
    const sa = order.indexOf(a.status || ""), sb = order.indexOf(b.status || "")
    return (sa < 0 ? 99 : sa) - (sb < 0 ? 99 : sb) || String(a.title || "").localeCompare(String(b.title || ""))
  })
  const lines = [CSV_COLUMNS.map(c => csvCell(c, false)).join(",")]
  for (const r of sorted) {
    const status = STATUS_LABELS[r.status || ""] || r.status || ""
    lines.push([
      csvCell(r.title),
      csvCell(r.author),
      csvCell(status, false),
      csvCell(r.started_at, false),
      csvCell(r.finished_at, false),
      csvCell(r.self_rating ? r.self_rating : "", false),
      csvCell(r.genre),
      csvCell(r.published_year, false),
      csvCell(notesByBook.get(idOf(r)) ?? ""),
    ].join(","))
  }
  // BOM so Excel reads accents and non-Latin titles correctly; CRLF per RFC 4180.
  return "\uFEFF" + lines.join("\r\n") + "\r\n"
}

export function csvFileName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `booklog-library-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`
}
