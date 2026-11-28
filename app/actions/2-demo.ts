"use server"
import { createClient } from "@supabase/supabase-js"
import { demoEnvNames, isDemoSlug, type StartDemoResult } from "@/lib/demo"

// Signs the visitor of booklogapp.com/demo/<slug> in to that demo account and returns only the session tokens.
// - Only a slug that is an active row in demo_accounts works; nothing else (no user id or email) is accepted.
// - The demo's email and password live only in server environment variables (DEMO_EMAIL_<SLUG>,
//   DEMO_PASSWORD_<SLUG>). They are never returned, logged or sent to the browser.
// - demo_signin_slot runs BEFORE any sign-in: at most 20 demo sign-ins per 5 minutes across all demos, so this
//   server can never push its own sign-ins into Supabase's auth rate limits. Visitors who already hold a demo
//   session never come here (the page reuses the session).
// - After signing in, the account must answer my_demo_slug() = slug, otherwise it is signed out and refused, so a
//   wrong environment value can never sign a visitor in to a real reader's account.
export async function startDemo(slug: string): Promise<StartDemoResult> {
  try {
    if (!isDemoSlug(slug)) return { ok: false, reason: "unavailable" }
    const names = demoEnvNames(slug)
    const email = process.env[names.email], password = process.env[names.password]
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!email || !password || !url || !anon) return { ok: false, reason: "unavailable" }

    const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: slot, error: slotError } = await db.rpc("demo_signin_slot", { p_slug: slug })
    if (slotError || (slot !== "ok" && slot !== "busy")) return { ok: false, reason: "unavailable" }
    if (slot === "busy") return { ok: false, reason: "busy" }

    const { data, error } = await db.auth.signInWithPassword({ email, password })
    if (error || !data.session) return { ok: false, reason: "unavailable" }

    const asDemo = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    })
    const { data: mySlug, error: slugError } = await asDemo.rpc("my_demo_slug")
    if (slugError || mySlug !== slug) {
      await db.auth.signOut().catch(() => {})
      return { ok: false, reason: "unavailable" }
    }
    return { ok: true, access_token: data.session.access_token, refresh_token: data.session.refresh_token }
  } catch {
    return { ok: false, reason: "unavailable" }
  }
}
