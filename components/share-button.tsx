"use client"
// The one Share entry point: a filled amber button with the standard share icon and a label,
// so it is noticed and understood. It only opens a popup; it never shares anything by itself.
export function ShareButton({ onClick, label = "Share" }: { onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center justify-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    style={{ height: 40, padding: "0 14px", border: 0, background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0 }}>
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>
    {label}
  </button>
}
