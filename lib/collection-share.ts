import { normalizeBookText } from "@/lib/book-identity"
import { shareCode, tokenFromShareCode } from "@/lib/public-share-path"

// Sharing tabs or the full library (agreed boards 3, 6, 7, 8). Pure helpers only.
export type ShareSource = "recommended" | "reading" | "queued" | "completed"
// Chooser order. On Hold is never a shared source.
export const SHARE_SOURCES: { value: ShareSource; label: string; hint: string }[] = [
  { value: "recommended", label: "Recommendations", hint: "Books you recommend" },
  { value: "queued", label: "Queued", hint: "Books you plan to read" },
  { value: "reading", label: "Reading", hint: "Books you are reading now" },
  { value: "completed", label: "Completed", hint: "Books you have finished" },
]
export const FULL_LIBRARY: ShareSource[] = ["reading", "queued", "completed", "recommended"]
// Tab order on the shared page and in the popup's book step.
export const TAB_ORDER: ShareSource[] = ["reading", "queued", "completed", "recommended"]
export const sourceLabel = (s: ShareSource) => SHARE_SOURCES.find(x => x.value === s)?.label || s
export const isShareSource = (v: unknown): v is ShareSource => typeof v === "string" && (FULL_LIBRARY as string[]).includes(v)
export const orderSources = (sources: ShareSource[]) => TAB_ORDER.filter(s => sources.includes(s))

export function sourceHeading(name: string, source: ShareSource): string {
  if (source === "recommended") return `${name} recommends`
  if (source === "reading") return `${name} is reading`
  if (source === "completed") return `${name} has read`
  return `${name}'s queued books`
}
// Collection link-preview title (board 1). "library" only for a full library with nothing left out.
export function collectionTitle(name: string, sources: ShareSource[], fullLibrary: boolean): string {
  if (fullLibrary) return `${name}'s library`
  if (sources.length === 1 && sources[0] === "recommended") return `${name}'s recommendations`
  if (sources.length === 1 && sources[0] === "queued") return `${name}'s queued books`
  return `Books from ${name}`
}
export function pageTitle(name: string, sources: ShareSource[]): string {
  return sources.length === 1 ? sourceHeading(name, sources[0]) : `${name}'s books`
}
export function chooserSummary(sources: ShareSource[], fullLibrary: boolean): string {
  if (fullLibrary) return "Full library"
  return SHARE_SOURCES.filter(s => sources.includes(s.value)).map(s => s.label).join(" + ") || "Choose what to share"
}
export function keepBrowsingLabel(name: string, sources: ShareSource[]): string {
  return sources.length === 1 && sources[0] === "recommended" ? `Keep browsing ${name}'s recommendations` : `Keep browsing ${name}'s books`
}
export const addButtonLabel = (n: number) => n === 0 ? "Add to my BookLog" : `Add ${n} ${n === 1 ? "book" : "books"} to my BookLog`
export const countBooks = (n: number) => `${n} ${n === 1 ? "book" : "books"}`

// One unique book across tabs (a book in two tabs is one tick and counts once).
export const bookKey = (b: { title: string; author: string }) => `${normalizeBookText(b.title)}\u0000${normalizeBookText(b.author)}`

// Selection survives sign-in, sign-up and the Google round trip (same browser).
const SELECTION_TTL_MS = 24 * 60 * 60 * 1000
export const selectionStorageKey = (token: string) => `bl-collection-selection-${token}`
export function encodeSelection(keys: string[], now = Date.now()): string { return JSON.stringify({ at: now, keys }) }
export function decodeSelection(raw: string | null, now = Date.now()): string[] {
  try {
    if (!raw) return []
    const v = JSON.parse(raw)
    if (!v || typeof v.at !== "number" || !Array.isArray(v.keys) || now - v.at > SELECTION_TTL_MS) return []
    return v.keys.filter((k: unknown) => typeof k === "string").slice(0, 3000)
  } catch { return [] }
}

// Readable, fixed path: /s/books/<code>. Lives under the existing reserved /s route,
// so no new top-level path can clash with an existing readable book link.
export const collectionPath = (token: string) => `/s/books/${shareCode(token)}`
export const tokenFromCollectionCode = (code: string) => tokenFromShareCode(code)
