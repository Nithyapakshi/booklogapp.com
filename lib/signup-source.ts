// Signup source: which link or site brought a new reader to BookLog.
//
// 1. On arrival, a page visit with UTM tags (or from another site) is remembered in this browser.
//    First visit wins; it expires after 30 days. Only the referring site's domain is kept, never the
//    full address.
// 2. Email signup sends the remembered values with the new account (signupSourceMetadata).
// 3. On the first signed-in visit to My Books, an account under 7 days old records one
//    "account.source" event: from the account (email signup), else from this browser (Google),
//    else "unknown". A referring site alone never sets the source: unknown stays unknown.
//
// Nothing here may block a page, signup or sign-in: every browser step swallows its own errors.
// No names, email or full addresses are recorded.
import { track } from "@/lib/usage"

export const SOURCE_KEY = "bl-source"
export const SOURCE_TTL_MS = 30 * 24 * 3600e3
export const NEW_ACCOUNT_MS = 7 * 24 * 3600e3
const RECORDED_PREFIX = "bl-source-recorded-"
// Accounts created before source capture existed are "before tracking", never "unknown".
export const TRACKING_FROM = "2026-11-24T00:00:00Z"

export interface StoredSource { s?: string; m?: string; c?: string; r?: string; t: number }

// Keep tags short and plain: lower case letters, digits, dot, _ and -. Dots are kept because
// others tag links with domains (ChatGPT adds utm_source=chatgpt.com).
export function cleanTag(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined
  const t = v.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40)
  return t || undefined
}

// The referring site's domain only, and only when it is another site.
export function referrerHost(referrer: string | null | undefined, ownHost: string): string | undefined {
  if (!referrer) return undefined
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "")
    const own = ownHost.toLowerCase().replace(/^www\./, "").split(":")[0]
    if (!host || host === own || host === "booklogapp.com" || host === "booklog.app") return undefined
    return host.slice(0, 60)
  } catch {
    return undefined
  }
}

// What this visit tells us, or null when it carries nothing (a direct visit).
export function sourceFromVisit(search: string, referrer: string | null | undefined, ownHost: string, now: number): StoredSource | null {
  let p: URLSearchParams
  try { p = new URLSearchParams(search) } catch { return null }
  const out: StoredSource = { t: now }
  const s = cleanTag(p.get("utm_source")), m = cleanTag(p.get("utm_medium")), c = cleanTag(p.get("utm_campaign")), r = referrerHost(referrer, ownHost)
  if (s) out.s = s
  if (m) out.m = m
  if (c) out.c = c
  if (r) out.r = r
  return s || r ? out : null
}

// A stored value that is unreadable or older than 30 days counts as nothing stored.
export function parseStored(raw: string | null, now: number): StoredSource | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (!v || typeof v !== "object" || typeof v.t !== "number" || now - v.t > SOURCE_TTL_MS || v.t > now + 60e3) return null
    const out: StoredSource = { t: v.t }
    const s = cleanTag(v.s), m = cleanTag(v.m), c = cleanTag(v.c), r = typeof v.r === "string" ? v.r.slice(0, 60) : undefined
    if (s) out.s = s
    if (m) out.m = m
    if (c) out.c = c
    if (r) out.r = r
    return out
  } catch {
    return null
  }
}

// First visit wins: keep an existing, unexpired value; otherwise take this visit's.
export function nextStored(existing: StoredSource | null, visit: StoredSource | null): StoredSource | null {
  if (existing) return null
  return visit
}

// Sent with an email signup. Only the values present; empty when there is nothing to send.
export function signupSourceMetadata(stored: StoredSource | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!stored) return out
  if (stored.s) out.signup_source = stored.s
  if (stored.m) out.signup_medium = stored.m
  if (stored.c) out.signup_campaign = stored.c
  if (stored.r) out.signup_referrer = stored.r
  return out
}

export function isNewAccount(createdAt: string | null | undefined, now: number): boolean {
  const t = Date.parse(createdAt || "")
  return Number.isFinite(t) && t >= Date.parse(TRACKING_FROM) && now - t >= -60e3 && now - t <= NEW_ACCOUNT_MS
}

type UserLike = {
  id?: string
  created_at?: string | null
  user_metadata?: Record<string, unknown> | null
  app_metadata?: { provider?: string } | null
} | null | undefined

// The one event recorded per new account. The source comes only from UTM tags.
export function sourceEventDetail(user: UserLike, stored: StoredSource | null): Record<string, string> {
  const meta = user?.user_metadata || {}
  const provider = cleanTag(user?.app_metadata?.provider) || "unknown"
  const fromAccount = cleanTag(meta.signup_source)
  if (fromAccount || typeof meta.signup_referrer === "string") {
    const d: Record<string, string> = { source: fromAccount || "unknown", via: "account", provider }
    const m = cleanTag(meta.signup_medium), c = cleanTag(meta.signup_campaign)
    if (m) d.medium = m
    if (c) d.campaign = c
    if (typeof meta.signup_referrer === "string") d.referrer = meta.signup_referrer.slice(0, 60)
    return d
  }
  if (stored) {
    const d: Record<string, string> = { source: stored.s || "unknown", via: "browser", provider }
    if (stored.m) d.medium = stored.m
    if (stored.c) d.campaign = stored.c
    if (stored.r) d.referrer = stored.r
    return d
  }
  return { source: "unknown", via: "none", provider }
}

// ---- Browser steps. Each one is silent on any failure. ----

export function captureSource(): void {
  try {
    if (typeof window === "undefined") return
    const now = Date.now()
    const existing = parseStored(window.localStorage.getItem(SOURCE_KEY), now)
    const visit = sourceFromVisit(window.location.search, document.referrer, window.location.host, now)
    const next = nextStored(existing, visit)
    if (next) window.localStorage.setItem(SOURCE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be blocked; skip quietly.
  }
}

export function readStoredSource(): StoredSource | null {
  try {
    if (typeof window === "undefined") return null
    return parseStored(window.localStorage.getItem(SOURCE_KEY), Date.now())
  } catch {
    return null
  }
}

export function recordSignupSource(user: UserLike): void {
  try {
    if (typeof window === "undefined" || !user?.id || !isNewAccount(user.created_at, Date.now())) return
    const flag = RECORDED_PREFIX + user.id
    if (window.localStorage.getItem(flag)) return
    window.localStorage.setItem(flag, "1")
    track("account.source", sourceEventDetail(user, readStoredSource()))
    window.localStorage.removeItem(SOURCE_KEY)
  } catch {
    // Recording must never get in the reader's way.
  }
}
