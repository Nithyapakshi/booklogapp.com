// Demo libraries for organiser outreach: booklogapp.com/demo/<slug> signs the visitor in to that demo account.
// Pure helpers shared by the demo page, the startDemo server action and tests.

export const DEMO_SLUG = /^[a-z0-9-]{1,40}$/
export const VISITOR_KEY = "bl-demo-visitor"

export function isDemoSlug(v: unknown): v is string {
  return typeof v === "string" && DEMO_SLUG.test(v)
}

// Server-only environment variable names for a demo, e.g. safar -> DEMO_EMAIL_SAFAR / DEMO_PASSWORD_SAFAR.
export function demoEnvNames(slug: string): { email: string; password: string } {
  const key = slug.toUpperCase().replace(/-/g, "_")
  return { email: `DEMO_EMAIL_${key}`, password: `DEMO_PASSWORD_${key}` }
}

// Where a demo visitor came from, in the same stored format as lib/signup-source.ts (first visit wins there).
export function demoSourceVisit(slug: string, now: number): { s: string; m: string; c: string; l: string; t: number } | null {
  if (!isDemoSlug(slug)) return null
  return { s: "bookclub", m: "demo", c: slug, l: `/demo/${slug}`, t: now }
}

// A random, pseudonymous id for this browser: 16 random bytes as hex. Not derived from the device, IP or
// anything personal, and never linked to a person. Counts browsers, not people.
export function newVisitorId(random: (n: number) => Uint8Array): string {
  return Array.from(random(16), b => b.toString(16).padStart(2, "0")).join("")
}

export function isVisitorId(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{32}$/.test(v)
}

export type StartDemoResult =
  | { ok: true; access_token: string; refresh_token: string }
  | { ok: false; reason: "unavailable" | "busy" }
