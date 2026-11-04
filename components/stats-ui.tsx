"use client"

// Shared look for the Stats page and Fill in the gaps: locked BookLog tokens via CSS variables (dark mode works).
import React from "react"

export const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
export const sans = { fontFamily: "'DM Sans', sans-serif" }
export const card: React.CSSProperties = { background: "var(--bl-fff)", border: "1px solid var(--bl-e0d5c4)", borderRadius: "14px" }
export const muted: React.CSSProperties = { color: "var(--bl-6b5c42)" }
export const nudge: React.CSSProperties = { background: "var(--bl-f3ede3)", border: "1px dashed var(--bl-d4c5a9)", borderRadius: "14px" }
export const heading: React.CSSProperties = { ...serif, fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--bl-2d2416)" }
export const primaryButton: React.CSSProperties = { ...sans, fontSize: "14px", fontWeight: 600, background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "none", borderRadius: "999px", padding: "0 20px", minHeight: "44px", cursor: "pointer", display: "inline-flex", alignItems: "center", textDecoration: "none" }
export const linkButton: React.CSSProperties = { ...sans, fontSize: "14px", fontWeight: 500, color: "var(--bl-c17f3e)", background: "none", border: "none", padding: 0, minHeight: "44px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function Progress({ done, of, label }: { done: number; of: number; label: string }) {
  return (
    <div role="img" aria-label={label} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} style={{ width: "36px", height: "9px", borderRadius: "999px", background: i < done ? "var(--bl-c17f3e)" : "var(--bl-fff)", border: "1px solid var(--bl-e0d5c4)" }} />
      ))}
      <span style={{ ...sans, ...muted, fontSize: "12px", marginLeft: "4px" }}>{Math.min(done, of)} of {of}</span>
    </div>
  )
}

// Two-way choice drawn as a pill, with a real pressed state for screen readers.
export function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} style={{ display: "inline-flex", alignSelf: "flex-start", flexWrap: "wrap", background: "var(--bl-f3ede3)", border: "1px solid var(--bl-e0d5c4)", borderRadius: "999px", padding: "3px", gap: "2px" }}>
      {options.map(o => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(o.value)}
            style={{ ...sans, fontSize: "13px", fontWeight: 600, minHeight: "36px", minWidth: "44px", padding: "0 14px", borderRadius: "999px", border: "none", cursor: "pointer", background: on ? "var(--bl-2d2416)" : "transparent", color: on ? "var(--bl-faf7f2)" : "var(--bl-5a4a38)" }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
