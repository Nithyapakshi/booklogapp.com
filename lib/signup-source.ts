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
// 4. Shared links: the first share page (single book or collection) opened in this browser is kept
//    separately ("bl-share", 30 days), with whether an earlier tagged visit was already stored. The
//    signup event carries both, so the dashboard can credit the share either when it came after a
//    search or other site (rule a) or only when it was the first visit (rule b).
//
// Nothing here may block a page, signup or sign-in: every browser step swallows its own errors.
// No names, email or full addresses are recorded.
import { trackWithCountry } from "@/lib/usage"

export const SOURCE_KEY = "bl-source"
export const SOURCE_TTL_MS = 30 * 24 * 3600e3
export const NEW_ACCOUNT_MS = 7 * 24 * 3600e3
const RECORDED_PREFIX = "bl-source-recorded-"
// Accounts created before source capture existed are "before tracking", never "unknown".
export const TRACKING_FROM = "2026-11-24T15:00:00Z"

export interface StoredSource { s?: string; m?: string; c?: string; r?: string; l?: string; t: number }

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

// The page a visit landed on: a plain path only, never its query or fragment.
export function landingPath(path: string | null | undefined): string | undefined {
  if (typeof path !== "string" || !path.startsWith("/")) return undefined
  const p = path.split(/[?#]/)[0].toLowerCase()
  return /^\/[a-z0-9/_-]{0,60}$/.test(p) ? p : undefined
}

// What this visit tells us, or null when it carries nothing (a direct visit).
export function sourceFromVisit(search: string, referrer: string | null | undefined, ownHost: string, now: number, path?: string): StoredSource | null {
  let p: URLSearchParams
  try { p = new URLSearchParams(search) } catch { return null }
  const out: StoredSource = { t: now }
  const s = cleanTag(p.get("utm_source")), m = cleanTag(p.get("utm_medium")), c = cleanTag(p.get("utm_campaign")), r = referrerHost(referrer, ownHost)
  if (s) out.s = s
  if (m) out.m = m
  if (c) out.c = c
  if (r) out.r = r
  const l = landingPath(path)
  if (l) out.l = l
  return s || r ? out : null
}

// A stored value that is unreadable or older than 30 days counts as nothing stored.
export function parseStored(raw: string | null, now: number): StoredSource | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (!v || typeof v !== "object" || typeof v.t !== "number" || now - v.t > SOURCE_TTL_MS || v.t > now + 60e3) return null
    const out: StoredSource = { t: v.t }
    const s = cleanTag(v.s), m = cleanTag(v.m), c = cleanTag(v.c), r = typeof v.r === "string" ? v.r.slice(0, 60) : undefined, l = landingPath(v.l)
    if (l) out.l = l
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

// ---- Shared links ----

export const SHARE_KEY = "bl-share"
// An earlier visit only counts as "before the share" when stored a few seconds earlier: the share
// page and the visit capture can run in either order on the same page load.
const SAME_VISIT_MS = 5000
const SHARE_TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface StoredShare { k: "book" | "collection"; id: string; t: number; first: boolean }

// First share opened keeps the credit: an existing, unexpired share is never replaced.
export function shareFromOpen(kind: unknown, token: unknown, existingShare: StoredShare | null, existingSource: StoredSource | null, now: number): StoredShare | null {
  if (existingShare) return null
  if ((kind !== "book" && kind !== "collection") || typeof token !== "string" || !SHARE_TOKEN.test(token)) return null
  const earlier = !!existingSource && existingSource.t < now - SAME_VISIT_MS
  return { k: kind, id: token.toLowerCase(), t: now, first: !earlier }
}

export function parseShare(raw: string | null, now: number): StoredShare | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (!v || typeof v !== "object" || typeof v.t !== "number" || now - v.t > SOURCE_TTL_MS || v.t > now + 60e3) return null
    if ((v.k !== "book" && v.k !== "collection") || typeof v.id !== "string" || !SHARE_TOKEN.test(v.id)) return null
    return { k: v.k, id: v.id.toLowerCase(), t: v.t, first: v.first !== false }
  } catch {
    return null
  }
}

// The share part of the signup event, from this browser. The signup form itself is unchanged, so an
// email signup confirmed in a different browser carries no share.
export function shareEventDetail(share: StoredShare | null): Record<string, string> {
  return share ? { share_kind: share.k, share_id: share.id, share_first: share.first ? "yes" : "no" } : {}
}

// Sent with an email signup. Only the values present; empty when there is nothing to send.
export function signupSourceMetadata(stored: StoredSource | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!stored) return out
  if (stored.s) out.signup_source = stored.s
  if (stored.m) out.signup_medium = stored.m
  if (stored.c) out.signup_campaign = stored.c
  if (stored.r) out.signup_referrer = stored.r
  if (stored.l) out.signup_landing = stored.l
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
    const l = landingPath(meta.signup_landing as string)
    if (l) d.landing = l
    return d
  }
  if (stored) {
    const d: Record<string, string> = { source: stored.s || "unknown", via: "browser", provider }
    if (stored.m) d.medium = stored.m
    if (stored.c) d.campaign = stored.c
    if (stored.r) d.referrer = stored.r
    if (stored.l) d.landing = stored.l
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
    const visit = sourceFromVisit(window.location.search, document.referrer, window.location.host, now, window.location.pathname)
    const next = nextStored(existing, visit)
    if (next) window.localStorage.setItem(SOURCE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be blocked; skip quietly.
  }
}

// Called by the share pages when they open. Silent on any failure.
export function rememberShareOpen(kind: "book" | "collection", token: string): void {
  try {
    if (typeof window === "undefined") return
    const now = Date.now()
    const next = shareFromOpen(kind, token, parseShare(window.localStorage.getItem(SHARE_KEY), now), parseStored(window.localStorage.getItem(SOURCE_KEY), now), now)
    if (next) window.localStorage.setItem(SHARE_KEY, JSON.stringify(next))
  } catch {
    // Storage can be blocked; skip quietly.
  }
}

export function readStoredShare(): StoredShare | null {
  try {
    if (typeof window === "undefined") return null
    return parseShare(window.localStorage.getItem(SHARE_KEY), Date.now())
  } catch {
    return null
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
    trackWithCountry("account.source", { ...sourceEventDetail(user, readStoredSource()), ...shareEventDetail(readStoredShare()) })
    window.localStorage.removeItem(SOURCE_KEY)
    window.localStorage.removeItem(SHARE_KEY)
  } catch {
    // Recording must never get in the reader's way.
  }
}
