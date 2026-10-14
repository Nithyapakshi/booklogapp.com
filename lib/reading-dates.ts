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

export type DatePrecision = "day" | "month"
export function toPrecision(value: unknown): DatePrecision { return value === "month" ? "month" : "day" }

// Month-only dates are stored as the first of the month with precision "month", so they never claim a day.
export function formatReadingDate(value: string, precision: DatePrecision = "day"): string {
  if (precision === "month") { const [y, m] = value.split("-").map(Number); return `${MONTHS[m - 1]} ${y}` }
  return formatDay(value)
}

// "Started 3 Oct 2026" / "Finished Oct 2026" / both joined, or "" when neither is set.
export function readingDatesLabel(startedAt?: string | null, finishedAt?: string | null, startedPrecision?: DatePrecision, finishedPrecision?: DatePrecision): string {
  const parts: string[] = []
  if (isValidDate(startedAt)) parts.push(`Started ${formatReadingDate(startedAt, startedPrecision)}`)
  if (isValidDate(finishedAt)) parts.push(`Finished ${formatReadingDate(finishedAt, finishedPrecision)}`)
  return parts.join(" · ")
}

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
export function daysInMonth(year: number, month: number): number { return new Date(Date.UTC(year, month, 0)).getUTCDate() }
