"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    async function finishSignIn() {
      try {
        const supabase = createClientSupabaseClient()
        const code = new URL(window.location.href).searchParams.get("code")
        if (code) {
          // PKCE flow: swap the one-time code for a session in this browser.
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            setFailed(true)
            return
          }
          router.replace("/books")
          return
        }
        // Implicit flow: the session token is in the URL hash and the client picks it up automatically.
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          router.replace("/books")
        } else {
          router.replace("/login")
        }
      } catch {
        setFailed(true)
      }
    }
    finishSignIn()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ background: "var(--bl-faf7f2)", fontFamily: "DM Sans, sans-serif" }}>
      {failed ? (
        <div className="text-center" style={{ maxWidth: "360px" }}>
          <p style={{ fontSize: "14px", color: "var(--bl-1a1208)", marginBottom: "1rem" }}>
            That sign-in link did not work here. It may have expired, or it was opened in a different browser than the one used to sign up.
          </p>
          <Link href="/login" style={{ fontSize: "13px", color: "var(--bl-primary-ink)", background: "var(--bl-c17f3e)", padding: "9px 20px", borderRadius: "8px", fontWeight: "500", textDecoration: "none" }}>
            Go to log in
          </Link>
        </div>
      ) : (
        <p style={{ color: "var(--bl-8a7560)", fontSize: "14px" }}>Signing you in...</p>
      )}
    </div>
  )
}
