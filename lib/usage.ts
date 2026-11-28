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

// Country: a two-letter code only (for example "AE"). Anything else counts as no country.
export function cleanCountry(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined
  const c = v.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(c) && c !== "XX" ? c : undefined
}

// Asks BookLog's own server (app/api/country) for the country of this browser's request. The browser
// calls it directly, so the country is the reader's own connection, never a server-to-server call.
// Only the code comes back; no IP address is stored. Gives up after 3 seconds.
export async function visitorCountry(): Promise<string | undefined> {
  try {
    const ctl = typeof AbortController === "undefined" ? null : new AbortController()
    const timer = ctl ? setTimeout(() => ctl.abort(), 3000) : null
    const res = await fetch("/api/country", { cache: "no-store", signal: ctl?.signal })
    if (timer) clearTimeout(timer)
    if (!res.ok) return undefined
    return cleanCountry((await res.json())?.country)
  } catch {
    return undefined
  }
}

// Same as track, with the reader's country added when it is known. The event is recorded either way.
export function trackWithCountry(event: string, detail: UsageDetail = {}, bookId?: string): void {
  try {
    visitorCountry().then(
      country => track(event, country ? { ...detail, country } : detail, bookId),
      () => track(event, detail, bookId),
    )
  } catch {
    // Recording must never get in the reader's way.
  }
}

// Once per local day per browser: lets us count daily and weekly active readers, and their country.
export function trackDailyOpen(): void {
  try {
    const d = new Date()
    const key = `bl-opened-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    if (window.localStorage.getItem(key)) return
    window.localStorage.setItem(key, "1")
    trackWithCountry("app.opened")
  } catch {
    // Storage can be blocked; skip quietly.
  }
}
