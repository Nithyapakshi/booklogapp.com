"use client"
// booklogapp.com/demo/<slug>: opens that organiser's demo library with no login step.
// 1. Remembers where the visit came from (bookclub / demo / <slug>), first visit wins.
// 2. Gives this browser a random pseudonymous visitor id (counts browsers, not people).
// 3. Reuses an existing demo session for this slug; a signed-in real reader is asked before switching.
// 4. Otherwise startDemo signs in server-side and returns only session tokens. No password reaches the browser.
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { startDemo } from "@/app/actions/demo"
import { captureDemoSource } from "@/lib/signup-source"
import { VISITOR_KEY, demoSourceVisit, isDemoSlug, isVisitorId, newVisitorId } from "@/lib/demo"

type Stage = "starting" | "confirm" | "busy" | "unavailable"

const sans = { fontFamily: "'DM Sans', sans-serif" }
const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }

function ensureVisitorId(): string | undefined {
  try {
    const have = window.localStorage.getItem(VISITOR_KEY)
    if (isVisitorId(have)) return have
    const id = newVisitorId(n => crypto.getRandomValues(new Uint8Array(n)))
    window.localStorage.setItem(VISITOR_KEY, id)
    return id
  } catch {
    return undefined
  }
}

// Recorded as the demo account, then the library opens. Gives up after 2 seconds so it never blocks.
async function openLibrary(slug: string, visitor: string | undefined) {
  const supabase = createClientSupabaseClient()
  await Promise.race([
    supabase.from("usage_events").insert({ event: "demo.opened", detail: visitor ? { slug, visitor } : { slug } }).then(() => {}, () => {}),
    new Promise(r => setTimeout(r, 2000)),
  ])
  window.location.href = "/books"
}

export default function DemoPage() {
  const params = useParams<{ slug: string }>()
  const slug = typeof params?.slug === "string" ? params.slug.toLowerCase() : ""
  const [stage, setStage] = useState<Stage>("starting")
  const ran = useRef(false)
  const visitor = useRef<string | undefined>(undefined)

  const signInFresh = async () => {
    setStage("starting")
    const result = await startDemo(slug).catch(() => ({ ok: false as const, reason: "unavailable" as const }))
    if (!result.ok) { setStage(result.reason); return }
    const { error } = await createClientSupabaseClient().auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token })
    if (error) { setStage("unavailable"); return }
    await openLibrary(slug, visitor.current)
  }

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!isDemoSlug(slug)) { setStage("unavailable"); return }
    captureDemoSource(demoSourceVisit(slug, Date.now()))
    visitor.current = ensureVisitorId()
    void (async () => {
      try {
        const supabase = createClientSupabaseClient()
        const { data } = await supabase.auth.getSession()
        if (!data.session) { await signInFresh(); return }
        const { data: mySlug, error } = await supabase.rpc("my_demo_slug")
        if (!error && mySlug === slug) { await openLibrary(slug, visitor.current); return }
        if (!error && typeof mySlug === "string" && mySlug) {
          // Another demo library: switching between demos needs no confirmation.
          await supabase.auth.signOut()
          await signInFresh()
          return
        }
        setStage("confirm") // a real reader is signed in: nothing happens without a tap
      } catch {
        setStage("unavailable")
      }
    })()
  }, [slug])

  const switchToDemo = async () => {
    setStage("starting")
    try { await createClientSupabaseClient().auth.signOut() } catch {}
    await signInFresh()
  }

  const card = (children: ReactNode) => (
    <main className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--bl-faf7f2)" }}>
      <div className="w-full max-w-sm rounded-lg border px-6 py-8 text-center" style={{ background: "var(--bl-fff)", borderColor: "var(--bl-e0d5c4)" }}>
        <p style={{ ...serif, fontSize: "22px", color: "var(--bl-2d2416)", marginBottom: "12px" }}>BookLog</p>
        {children}
      </div>
    </main>
  )

  if (stage === "confirm") return card(
    <>
      <p style={{ ...sans, fontSize: "15px", color: "var(--bl-2d2416)", marginBottom: "8px" }}>Switch to the demo library?</p>
      <p style={{ ...sans, fontSize: "13px", color: "var(--bl-6b5c42)", marginBottom: "20px" }}>You will be signed out of your own account.</p>
      <div className="flex justify-center gap-3">
        <a href="/books" style={{ ...sans, fontSize: "13px", color: "var(--bl-6b5c42)", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "6px", padding: "8px 14px" }}>Cancel</a>
        <button type="button" onClick={switchToDemo} style={{ ...sans, fontSize: "13px", fontWeight: 500, color: "#fff", background: "var(--bl-c17f3e)", border: "none", borderRadius: "6px", padding: "8px 14px", cursor: "pointer" }}>Switch to demo</button>
      </div>
    </>
  )
  if (stage === "busy") return card(
    <p style={{ ...sans, fontSize: "14px", color: "var(--bl-6b5c42)" }}>The demo is busy. Please try again in a few minutes.</p>
  )
  if (stage === "unavailable") return card(
    <>
      <p style={{ ...sans, fontSize: "14px", color: "var(--bl-6b5c42)", marginBottom: "16px" }}>This demo link is not available.</p>
      <a href="/home" style={{ ...sans, fontSize: "13px", color: "var(--bl-c17f3e)", textDecoration: "underline" }}>See what BookLog is</a>
    </>
  )
  return card(<p style={{ ...sans, fontSize: "14px", color: "var(--bl-6b5c42)" }}>Opening the demo library...</p>)
}
