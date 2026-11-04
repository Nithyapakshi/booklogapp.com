// Usage tracking from the app: records actions that change no data (theme, export, sharing, Discover,
// Stats, Amazon clicks) and where a book was added from. Data changes are recorded by the database.
//
// Never affects the reader: not awaited, never throws, does nothing when signed out or offline.
// Only event names, book ids and small counts. No note text, search words, names or email.
import { createClientSupabaseClient } from "@/lib/supabase/client"

export type UsageDetail = Record<string, string | number | boolean | null>

const EVENT = /^[a-z_]+\.[a-z_]+$/

export function track(event: string, detail?: UsageDetail, bookId?: string): void {
  try {
    if (typeof window === "undefined" || !EVENT.test(event)) return
    const row: { event: string; detail: UsageDetail; book_id?: string } = { event, detail: detail || {} }
    if (bookId) row.book_id = bookId
    createClientSupabaseClient()
      .from("usage_events")
      .insert(row)
      .then(() => {}, () => {})
  } catch {
    // Recording must never get in the reader's way.
  }
}

// Once per local day per browser: lets us count daily and weekly active readers.
export function trackDailyOpen(): void {
  try {
    const d = new Date()
    const key = `bl-opened-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (window.localStorage.getItem(key)) return
    window.localStorage.setItem(key, "1")
    track("app.opened")
  } catch {
    // Storage can be blocked; skip quietly.
  }
}
