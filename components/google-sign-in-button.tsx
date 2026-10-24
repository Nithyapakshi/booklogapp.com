"use client"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"

// Dark-shipped: the button only renders once NEXT_PUBLIC_GOOGLE_LOGIN=true is set
// on Vercel, which happens after the Google + Supabase provider setup is done.
export const GOOGLE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "true"

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 5.9 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 5.9 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  )
}

export function GoogleSignInButton({ onError }: { onError?: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  if (!GOOGLE_LOGIN_ENABLED) return null

  const handleGoogle = async () => {
    setBusy(true)
    try {
      const supabase = createClientSupabaseClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        onError?.(`Google sign-in error: ${error.message}`)
        setBusy(false)
      }
      // On success the browser leaves for Google and returns to /auth/callback.
    } catch (err) {
      onError?.(`Google sign-in error: ${err instanceof Error ? err.message : String(err)}`)
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        style={{ width: "100%", padding: "10px", background: "var(--bl-fff)", color: "var(--bl-1a1208)", border: "0.5px solid var(--bl-d4c5a9)", borderRadius: "7px", fontSize: "13px", fontWeight: "500", cursor: busy ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "1rem" }}
      >
        <GoogleMark />
        {busy ? "Opening Google..." : "Continue with Google"}
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
        <div style={{ flex: 1, height: "0.5px", background: "var(--bl-e0d5c4)" }} />
        <span style={{ fontSize: "12px", color: "var(--bl-8a7560)" }}>or</span>
        <div style={{ flex: 1, height: "0.5px", background: "var(--bl-e0d5c4)" }} />
      </div>
    </>
  )
}
