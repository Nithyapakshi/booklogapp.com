"use client"

// One-time email preference card for readers never asked (see lib/marketing-consent.ts).
// "Yes, email me" is the main button, "No thanks" sits below it. Nothing is pre-selected.
// New Google sign-ups get the same choice inside the welcome survey instead.
// The X records "closed without choosing": not consent, and the card is not shown again.
// The Settings switch is the way back for anyone who closed it or said no.
// Bottom sheet on phones, centred card on wider screens. Never blocks the library.

import React, { useEffect, useRef, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { CONSENT_LEAD, CONSENT_REST, CONSENT_VERSION, type PromptVariant } from "@/lib/marketing-consent"

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
const sans = { fontFamily: "'DM Sans', sans-serif" }

export function EmailPreferencePrompt({ variant, onFinished }: {
  variant: PromptVariant
  onFinished: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savingRef = useRef(false)
  savingRef.current = saving
  const dismissRef = useRef<() => void>(() => {})
  // Closes once only: a repeated Esc (key repeat) arriving before the card unmounts must not record twice.
  const closedRef = useRef(false)

  // Esc closes it like the X. Focus starts on the main button.
  // (email.prompt_shown is recorded by app/books/page.tsx, once per showing.)
  const yesRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    yesRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismissRef.current() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [variant])

  const choose = async (choice: boolean) => {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const { data, error: rpcError } = await createClientSupabaseClient()
        .rpc("set_marketing_preference", { p_choice: choice, p_source: variant, p_version: CONSENT_VERSION })
      // A yes that failed to save must not look saved: stay open and say so.
      // A no that failed closes anyway; worst case the card asks again next visit.
      if ((rpcError || data !== true) && choice) { setError("This was not saved. Try again."); return }
      onFinished()
    } catch {
      if (choice) setError("This was not saved. Try again.")
      else onFinished()
    } finally {
      setSaving(false)
    }
  }

  const dismiss = () => {
    if (savingRef.current || closedRef.current) return
    closedRef.current = true
    try {
      createClientSupabaseClient().rpc("dismiss_marketing_prompt", { p_source: variant }).then(() => {}, () => {})
    } catch {
      // Closing must always work.
    }
    onFinished()
  }
  dismissRef.current = dismiss

  const titleId = "email-pref-title"

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId}
      className="items-end sm:items-center"
      style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "center", background: "rgba(26,18,8,0.45)", ...sans }}>
      <div className="rounded-t-2xl sm:rounded-2xl sm:m-3"
        style={{ background: "var(--bl-fff)", border: "1px solid var(--bl-e0d5c4)", width: "100%", maxWidth: 440, maxHeight: "calc(100vh - 24px)", overflowY: "auto", padding: "22px 24px 26px", position: "relative", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}>
        <button type="button" aria-label="Close" disabled={saving} onClick={dismiss}
          style={{ position: "absolute", top: 8, right: 8, width: 44, height: 44, border: "none", background: "none", fontSize: 15, color: "var(--bl-8a7560)", cursor: saving ? "default" : "pointer", lineHeight: 1 }}>✕</button>

        <h2 id={titleId} style={{ ...serif, fontSize: 22, fontWeight: 400, color: "var(--bl-1a1208)", margin: "0 0 10px", paddingRight: 36 }}>
          Hear from BookLog?
        </h2>

          <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--bl-1a1208)", margin: "0 0 16px" }}>
            <strong style={{ fontWeight: 600 }}>{CONSENT_LEAD}</strong> {CONSENT_REST}
          </p>

        {error && <p role="alert" style={{ fontSize: 13, color: "var(--bl-a04040)", margin: "0 0 10px" }}>{error}</p>}

        <button ref={yesRef} type="button" disabled={saving} onClick={() => choose(true)}
          style={{ width: "100%", minHeight: 48, borderRadius: 8, border: "none", background: saving ? "var(--bl-d4a574)" : "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", fontSize: 15, fontWeight: 600, cursor: saving ? "default" : "pointer", ...sans }}>
          {saving ? "Saving..." : "Yes, email me"}
        </button>
        <button type="button" disabled={saving} onClick={() => choose(false)}
          style={{ display: "block", width: "100%", minHeight: 44, marginTop: 4, background: "none", border: "none", fontSize: 14, color: "var(--bl-6b5c42)", cursor: saving ? "default" : "pointer", ...sans }}>
          No thanks
        </button>
      </div>
    </div>
  )
}
