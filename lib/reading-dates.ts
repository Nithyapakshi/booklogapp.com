// Start and finish dates are plain calendar dates (yyyy-mm-dd), kept in the reader's own day, never shifted by timezone.
export function todayLocal(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${now.getFullYear()}-${m}-${d}`
}

export function isValidDate(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export function formatDay(value: string): string {
  const [y, m, d] = value.split("-").map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// "Started 3 Oct 2026" / "Finished 10 Oct 2026" / both joined, or "" when neither is set.
export function readingDatesLabel(startedAt?: string | null, finishedAt?: string | null): string {
  const parts: string[] = []
  if (isValidDate(startedAt)) parts.push(`Started ${formatDay(startedAt)}`)
  if (isValidDate(finishedAt)) parts.push(`Finished ${formatDay(finishedAt)}`)
  return parts.join(" · ")
}
