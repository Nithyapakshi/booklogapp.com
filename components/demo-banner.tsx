"use client"
import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { track } from "@/lib/usage"
import { VISITOR_KEY, isVisitorId } from "@/lib/demo"

function visitorId(): string | undefined {
  try {
    const v = window.localStorage.getItem(VISITOR_KEY)
    return isVisitorId(v) ? v : undefined
  } catch {
    return undefined
  }
}

// Shown on My Books for demo accounts only. "Create your own" signs out of the demo first, then opens signup,
// so the new account is the visitor's own and the demo source (bookclub / demo / <slug>) stays in this browser.
export function DemoBanner() {
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    const db = createClientSupabaseClient()
    void (async () => {
      try {
        const { data: slug } = await db.rpc("my_demo_slug")
        if (typeof slug !== "string" || !slug) return
        const { data } = await db.rpc("demo_display_name", { p_slug: slug })
        if (typeof data === "string" && data.trim()) setName(data.trim().slice(0, 60))
      } catch {}
    })()
  }, [])
  useEffect(() => {
    const v = visitorId()
    track("demo.banner_seen", v ? { visitor: v } : {})
  }, [])

  const createOwn = async () => {
    if (busy) return
    setBusy(true)
    const supabase = createClientSupabaseClient()
    try {
      const v = visitorId()
      // Recorded before signing out: the event belongs to the demo account. Gives up after 2 seconds.
      await Promise.race([
        supabase.from("usage_events").insert({ event: "demo.signup_click", detail: v ? { visitor: v } : {} }).then(() => {}, () => {}),
        new Promise(r => setTimeout(r, 2000)),
      ])
      await supabase.auth.signOut()
    } catch {
      // Go to signup either way.
    }
    window.location.href = "/signup"
  }

  return (
    <div
      role="note"
      className="mb-5 flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "var(--bl-fdf3e7)", borderColor: "var(--bl-e8c9a0)", fontFamily: "'DM Sans', sans-serif" }}
    >
      <p style={{ fontSize: "13px", color: "var(--bl-6b4a1f)", margin: 0 }}>
        {name ? `A BookLog demo for ${name}. ` : "You are exploring a demo library. "}Create your own free BookLog account.
      </p>
      <button
        type="button"
        onClick={createOwn}
        disabled={busy}
        style={{ fontSize: "13px", fontWeight: 500, color: "#fff", background: "var(--bl-c17f3e)", border: "none", borderRadius: "6px", padding: "8px 14px", cursor: busy ? "default" : "pointer", whiteSpace: "nowrap", opacity: busy ? 0.7 : 1 }}
      >
        {busy ? "One moment..." : "Create my account"}
      </button>
    </div>
  )
}
