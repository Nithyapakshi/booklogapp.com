"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import type { Session, SupabaseClient } from "@supabase/supabase-js"

// The Supabase client is configured with detectSessionInUrl: true, so it may
// already be exchanging a code from this URL on its own. Always check for a
// session first, and re-check after any manual exchange attempt, so a link
// never double-consumes its one-time code.
async function waitForSession(supabase: SupabaseClient, attempts: number): Promise<Session | null> {
  for (let i = 0; i < attempts; i++) {
    const { data } = await supabase.auth.getSession()
    if (data.session) return data.session
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return null
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    async function finishSignIn() {
      try {
        const supabase = createClientSupabaseClient()

        // 1. A session may already exist (returning visitor, or the automatic
        //    URL exchange has already finished).
        const existing = await waitForSession(supabase, 2)
        if (existing) {
          router.replace("/books")
          return
        }

        // 2. PKCE flow: the confirm link carries a one-time ?code=. Swap it for
        //    a session in this browser. If the automatic exchange beat us to it
        //    the manual call fails harmlessly, so re-check the session before
        //    declaring failure.
        const code = new URL(window.location.href).searchParams.get("code")
        if (code) {
          await supabase.auth.exchangeCodeForSession(code).catch(() => null)
          const session = await waitForSession(supabase, 2)
          if (session) {
            router.replace("/books")
          } else {
            setFailed(true)
          }
          return
        }

        // 3. Implicit flow: the token is in the URL hash and the client picks it
        //    up automatically - step 1 already covered it. Nothing usable here.
        router.replace("/login")
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
