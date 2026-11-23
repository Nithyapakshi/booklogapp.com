"use client"

// Settings: the reader's marketing email switch (see lib/marketing-consent.ts).
// Off unless the reader has said yes and not unsubscribed since. Each change is saved straight away
// with the exact words shown (server side) and the source "settings". Account emails such as
// password resets are not affected.

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { CONSENT_LEAD, CONSENT_VERSION, parsePreference } from "@/lib/marketing-consent"

export function EmailPreferenceSetting() {
  const { user } = useAuth()
  const [on, setOn] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!user) return
    createClientSupabaseClient().rpc("get_marketing_preference")
      .then(({ data, error }) => {
        const pref = error ? null : parsePreference(data)
        if (pref) setOn(pref.subscribed)
        else setMessage("We could not load your email setting just now.")
      }, () => setMessage("We could not load your email setting just now."))
  }, [user])

  const toggle = async () => {
    if (on === null || saving) return
    const next = !on
    setSaving(true)
    setMessage("")
    try {
      const { data, error } = await createClientSupabaseClient()
        .rpc("set_marketing_preference", { p_choice: next, p_source: "settings", p_version: CONSENT_VERSION })
      if (error || data !== true) throw new Error("save")
      setOn(next)
      setMessage(next ? "You will get BookLog emails. Turn this off at any time." : "You will not get BookLog emails.")
    } catch {
      setMessage("This was not saved. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mb-5" aria-labelledby="emails-heading">
      <h2 id="emails-heading" className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Emails</h2>
      <div className="rounded-[10px] border bg-card p-5 text-card-foreground">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="marketing-switch" className="cursor-pointer">
            <span className="block text-sm font-semibold">Book recommendations and new features</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">Occasional emails. Turn off at any time.</span>
          </label>
          <button id="marketing-switch" type="button" role="switch" aria-checked={on === true} aria-label={CONSENT_LEAD}
            disabled={on === null || saving} onClick={toggle}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full disabled:opacity-60">
            <span aria-hidden="true" style={{ width: 36, height: 20, borderRadius: 10, background: on ? "var(--bl-c17f3e)" : "var(--bl-d4c5a9)", position: "relative", display: "block", transition: "background 0.2s" }}>
              <span style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--bl-fff)", position: "absolute", top: 2, left: on ? 18 : 2, transition: "left 0.2s" }} />
            </span>
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Account emails such as password resets are always sent.</p>
        {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
      </div>
    </section>
  )
}
