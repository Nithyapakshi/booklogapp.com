"use client"
import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { track } from "@/lib/usage"

// Shown inside a Share popup when the reader has no display name yet, so they can
// add it right there instead of leaving for Settings. Saves the same profiles.name
// field Settings edits. Never uses or shows the email address.
export function DisplayNameField({ onSaved }: { onSaved: (name: string) => void }) {
  const [name, setName] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("")
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const value = name.trim().replace(/\s+/g, " ").slice(0, 80)
    if (!value || busy) { setError(value ? "" : "Enter the name people will see."); return }
    setBusy(true); setError("")
    try {
      const db = createClientSupabaseClient(), { data: { user } } = await db.auth.getUser()
      if (!user) throw new Error("Log in to share.")
      const { data, error } = await db.from("profiles").update({ name: value }).eq("user_id", user.id).select("name")
      if (error || !data?.length) throw new Error("Your name was not saved. Please try again.")
      track("share.display_name_added")
      onSaved(value)
    } catch (err) { setError(err instanceof Error ? err.message : "Your name was not saved. Please try again.") }
    finally { setBusy(false) }
  }
  return <form onSubmit={save} className="rounded-lg p-3" style={{ background: "var(--bl-f3ede3)" }}>
    <label htmlFor="share-display-name" className="block text-sm font-semibold" style={{ color: "var(--bl-1a1208)" }}>Your name</label>
    <p className="mt-0.5 text-xs" style={{ color: "var(--bl-6b5c42)" }}>People you share with will see this name. You can change it later in Settings.</p>
    <div className="mt-2 flex gap-2">
      <input id="share-display-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} autoComplete="given-name" className="min-w-0 flex-1 rounded-md px-3 text-[15px]" style={{ height: 44, border: "1px solid var(--bl-e0d5c4)", background: "var(--bl-fff)", color: "var(--bl-1a1208)" }} />
      <button type="submit" disabled={busy} className="rounded-md px-4 text-sm font-semibold" style={{ height: 44, border: 0, background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", opacity: busy ? .7 : 1 }}>{busy ? "Saving..." : "Save"}</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
  </form>
}
