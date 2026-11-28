// Hard bounds for Ask AI (app/actions/ai-recommendations.ts). Every caller input is bounded on the server, so the
// cost of one call has a fixed ceiling whoever calls it.

export const AI_MAX_QUERY_CHARS = 1000      // over this the request is refused, never truncated
export const AI_MAX_EXCLUDE_ITEMS = 60
export const AI_MAX_EXCLUDE_ITEM_CHARS = 120
export const AI_MAX_TOKENS_SMALL = 1024     // up to 5 books
export const AI_MAX_TOKENS_LARGE = 4096     // 6 to 15 books
export const AI_MAX_RETRIES = 1             // the SDK may send each call at most twice in total

// The request exactly as typed, or null when it is empty or longer than the cap.
export function checkQuery(query: unknown): string | null {
  if (typeof query !== "string" || !query.trim() || query.length > AI_MAX_QUERY_CHARS) return null
  return query
}

export function boundExclude(exclude: unknown): string[] {
  if (!Array.isArray(exclude)) return []
  return exclude.slice(0, AI_MAX_EXCLUDE_ITEMS).map(t => String(t).slice(0, AI_MAX_EXCLUDE_ITEM_CHARS))
}

export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length
}

// Preview only: a fixed, valid model reply in the exact format the real model is asked for. No API call is made.
const STUB_BOOKS = [
  { title: "The Remains of the Day", author: "Kazuo Ishiguro", genre: "Fiction", description: "A butler looks back on decades of service and the choices he made. Quiet, precise and moving." },
  { title: "Pachinko", author: "Min Jin Lee", genre: "Historical fiction", description: "Four generations of a Korean family in Japan. A sweeping story of family, identity and survival." },
  { title: "The Book Thief", author: "Markus Zusak", genre: "Historical fiction", description: "Narrated by Death, a girl in wartime Germany finds comfort in stolen books." },
  { title: "Circe", author: "Madeline Miller", genre: "Fantasy", description: "The witch of Greek myth tells her own story of exile, power and transformation." },
  { title: "The Nightingale", author: "Kristin Hannah", genre: "Historical fiction", description: "Two sisters in occupied France take very different paths to survive and resist." },
  { title: "Anxious People", author: "Fredrik Backman", genre: "Fiction", description: "A failed bank robbery turns into a hostage drama full of warmth and humour." },
  { title: "Klara and the Sun", author: "Kazuo Ishiguro", genre: "Science fiction", description: "An artificial friend observes the family she serves and the meaning of love." },
  { title: "The Thursday Murder Club", author: "Richard Osman", genre: "Mystery", description: "Four retirees meet weekly to solve cold cases, until a real murder arrives." },
]
export function previewStubText(): string {
  return JSON.stringify(STUB_BOOKS.map(b => ({ ...b, on_topic: true })))
}
