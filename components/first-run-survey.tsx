"use client"

// Welcome survey for signed-in users with no survey_events row yet (see lib/survey.ts).
// Shows over My Books only (app/books/page.tsx gates that) and records exactly one of
// three outcomes per popup: completed (answers saved), skipped ("Skip for now"), or
// closed_x (the X). Completed and skipped never ask again; the X asks again after 7 days.

import React, { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { SURVEY_GENRES, SURVEY_MOODS, MAX_SURVEY_GENRES, type SurveyAnswers } from "@/lib/survey"

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
const sans = { fontFamily: "'DM Sans', sans-serif" }

export function FirstRunSurvey({ userId, initial, onFinished }: {
  userId: string
  initial?: SurveyAnswers | null
  onFinished: (outcome: "completed" | "skipped" | "closed_x") => void
}) {
  const [genres, setGenres] = useState<string[]>(initial?.genres || [])
  const [mood, setMood] = useState<string>(initial?.mood || "")
  const [author, setAuthor] = useState<string>(initial?.favoriteAuthor || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleGenre = (chip: string) => {
    setGenres(prev => prev.includes(chip) ? prev.filter(g => g !== chip) : prev.length >= MAX_SURVEY_GENRES ? prev : [...prev, chip])
  }

  const editMode = !!initial
  const record = async (outcome: "completed" | "skipped" | "closed_x") => {
    if (saving) return
    if (outcome === "completed" && genres.length === 0) { setError("Pick at least one genre so we know what you enjoy."); return }
    // Edit answers changes answers only: closing it with the X or "Skip for now" writes
    // nothing, so survey_events stays one row per real first-run decision (critic, 21 Oct 2026).
    if (editMode && outcome !== "completed") { onFinished(outcome); return }
    setSaving(true)
    setError(null)
    try {
      const supabase = createClientSupabaseClient()
      const row: Record<string, unknown> = { user_id: userId, event_type: outcome }
      if (outcome === "completed") {
        row.genres = genres
        row.mood = mood || null
        row.favorite_author = author.trim() || null
      }
      const { error: writeError } = await supabase.from("survey_events").insert(row)
      // A completed answer that failed to save must not look saved: stay open and say so.
      // Dismissals (skip / X) close either way; worst case the survey asks again next visit.
      if (writeError && outcome === "completed") { setError("This was not saved. Try again."); return }
      onFinished(outcome)
    } catch {
      if (outcome === "completed") setError("This was not saved. Try again.")
      else onFinished(outcome)
    } finally {
      setSaving(false)
    }
  }

  const chip = (label: string, active: boolean, onClick: () => void): React.ReactNode => (
    <button key={label} type="button" onClick={onClick} disabled={saving} style={{
      padding: "6px 13px", borderRadius: 999, fontSize: 13, cursor: saving ? "default" : "pointer", ...sans,
      border: active ? "1px solid var(--bl-c17f3e)" : "1px solid var(--bl-d4c5a9)",
      background: active ? "var(--bl-c17f3e)" : "var(--bl-f5ede0)",
      color: active ? "var(--bl-fff)" : "var(--bl-1a1208)",
    }}>{label}</button>
  )

  return (
    <div role="dialog" aria-label="Welcome survey" style={{
      position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(26,18,8,0.45)", padding: 12, ...sans,
    }}>
      <div style={{
        background: "var(--bl-fff)", border: "1px solid var(--bl-e0d5c4)", borderRadius: 16,
        width: "100%", maxWidth: 560, maxHeight: "calc(100vh - 24px)", overflowY: "auto",
        padding: "26px 26px 18px", position: "relative", boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      }}>
        <button type="button" aria-label="Close survey" disabled={saving} onClick={() => record("closed_x")} style={{
          position: "absolute", top: 14, right: 16, border: "none", background: "none",
          fontSize: 15, color: "var(--bl-8a7560)", cursor: saving ? "default" : "pointer", lineHeight: 1,
        }}>✕</button>
        <div style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--bl-8a7560)", textTransform: "uppercase", marginBottom: 5 }}>Welcome to BookLog</div>
        <div style={{ ...serif, fontSize: 24, fontWeight: 600, color: "var(--bl-1a1208)", marginBottom: 4 }}>Three quick questions</div>
        <div style={{ fontSize: 13, color: "var(--bl-8a7560)", marginBottom: 16 }}>So Discover can suggest books you will actually like.</div>

        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--bl-1a1208)", marginBottom: 8 }}>
          1. What do you enjoy? <span style={{ fontWeight: 400, color: "var(--bl-8a7560)" }}>Pick up to {MAX_SURVEY_GENRES}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {SURVEY_GENRES.map(g => chip(g.chip, genres.includes(g.chip), () => toggleGenre(g.chip)))}
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--bl-1a1208)", marginBottom: 8 }}>2. What are you in the mood for?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {SURVEY_MOODS.map(m => chip(m, mood === m, () => setMood(prev => prev === m ? "" : m)))}
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--bl-1a1208)", marginBottom: 8 }}>
          3. An author you love? <span style={{ fontWeight: 400, color: "var(--bl-8a7560)" }}>Optional</span>
        </div>
        <input
          value={author} onChange={e => setAuthor(e.target.value)} disabled={saving}
          maxLength={120}
          placeholder="e.g. Madeline Miller" aria-label="An author you love"
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 13px", borderRadius: 10,
            border: "1px solid var(--bl-d4c5a9)", background: "var(--bl-faf7f2)", color: "var(--bl-1a1208)",
            fontSize: 14, marginBottom: 18, outline: "none", ...sans,
          }}
        />

        {error && <p role="alert" style={{ fontSize: 13, color: "var(--bl-a04040)", marginTop: -8, marginBottom: 12 }}>{error}</p>}

        <button type="button" disabled={saving} onClick={() => record("completed")} style={{
          width: "100%", padding: 13, borderRadius: 10, border: "none",
          background: saving ? "var(--bl-d4a574)" : "var(--bl-c17f3e)", color: "var(--bl-fff)",
          fontSize: 15, fontWeight: 600, cursor: saving ? "default" : "pointer", ...sans,
        }}>{saving ? "Saving..." : initial ? "Save answers" : "Show my books"}</button>
        <div style={{ textAlign: "center", marginTop: 9 }}>
          <button type="button" disabled={saving} onClick={() => record("skipped")} style={{
            background: "none", border: "none", fontSize: 13, color: "var(--bl-8a7560)",
            cursor: saving ? "default" : "pointer", ...sans,
          }}>Skip for now</button>
        </div>
      </div>
    </div>
  )
}
