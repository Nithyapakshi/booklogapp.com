"use client"

import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

function BookLogLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="17" width="22" height="5" rx="1.5" fill="#c17f3e" />
      <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="#c17f3e" opacity="0.62" />
      <rect x="3" y="4" width="12" height="5" rx="1.5" fill="#c17f3e" opacity="0.32" />
    </svg>
  )
}

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClientSupabaseClient()
        const { data } = await supabase.auth.getUser()
        setLoading(false)
      } catch (err) {
        console.error("Auth check error:", err)
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#faf7f2" }}>
        <div className="text-center">
          <p style={{ color: "#8a7560", fontFamily: "DM Sans, sans-serif" }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#faf7f2", fontFamily: "DM Sans, sans-serif" }}>

      {/* Header */}
      <header style={{ borderBottom: "0.5px solid #e0d5c4", background: "#faf7f2" }}>
        <div className="container flex h-14 items-center justify-between" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem" }}>
          <div className="flex items-center gap-2">
            <BookLogLogo size={22} />
            <span style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#1a1208", fontWeight: "normal" }}>BookLog</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/login" style={{ fontSize: "13px", color: "#6b5c42", padding: "6px 14px", borderRadius: "6px" }}>
              Log in
            </Link>
            <Link href="/signup" style={{ fontSize: "13px", color: "#fff", background: "#c17f3e", padding: "7px 16px", borderRadius: "7px", fontWeight: "500" }}>
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center text-center" style={{ padding: "2rem 1.5rem 1.75rem" }}>
        <div style={{ maxWidth: "480px" }}>
          <p style={{ fontSize: "11px", color: "#c17f3e", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1rem" }}>
            Your reading life, organised
          </p>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(26px, 5vw, 36px)", color: "#1a1208", fontWeight: "normal", lineHeight: "1.28", marginBottom: "1rem" }}>
            Track the books that shape you
          </h1>
          <p style={{ fontSize: "14px", color: "#6b5c42", lineHeight: "1.75", marginBottom: "2rem" }}>
            Log what you're reading, collect your favourites, and discover what to read next — all in one quiet place.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link href="/signup" style={{ fontSize: "13px", color: "#fff", background: "#c17f3e", padding: "10px 24px", borderRadius: "7px", fontWeight: "500" }}>
              Get started for free
            </Link>
            <Link href="/login" style={{ fontSize: "13px", color: "#6b5c42", padding: "10px 24px", borderRadius: "7px", border: "0.5px solid #d4c5a9" }}>
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Features — 2×2 grid */}
      <section style={{ background: "#f3ede3", borderTop: "0.5px solid #e0d5c4", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>

          <div style={{ background: "#faf7f2", borderRadius: "10px", border: "0.5px solid #e0d5c4", padding: "1.25rem" }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <BookLogLogo size={20} />
            </div>
            <h3 style={{ fontSize: "13px", fontWeight: "500", color: "#1a1208", marginBottom: "4px" }}>Track your reading</h3>
            <p style={{ fontSize: "12px", color: "#8a7560", lineHeight: "1.6" }}>Reading, Queued, Completed, On Hold — always know where you are.</p>
          </div>

          <div style={{ background: "#faf7f2", borderRadius: "10px", border: "0.5px solid #e0d5c4", padding: "1.25rem" }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="8" height="16" rx="1.5" fill="#c17f3e" opacity="0.32" />
                <rect x="12" y="4" width="5" height="16" rx="1.5" fill="#c17f3e" opacity="0.62" />
                <rect x="19" y="4" width="3" height="16" rx="1.5" fill="#c17f3e" />
              </svg>
            </div>
            <h3 style={{ fontSize: "13px", fontWeight: "500", color: "#1a1208", marginBottom: "4px" }}>Organise your library</h3>
            <p style={{ fontSize: "12px", color: "#8a7560", lineHeight: "1.6" }}>Rate books, add notes, and keep your collection tidy in one place.</p>
          </div>

          <div style={{ background: "#faf7f2", borderRadius: "10px", border: "0.5px solid #e0d5c4", padding: "1.25rem" }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="8" cy="12" r="5" stroke="#c17f3e" strokeWidth="1.4" fill="#f5ede0" />
                <circle cx="16" cy="12" r="5" stroke="#c17f3e" strokeWidth="1.4" fill="#f5ede0" opacity="0.7" />
              </svg>
            </div>
            <h3 style={{ fontSize: "13px", fontWeight: "500", color: "#1a1208", marginBottom: "4px" }}>Share recommendations</h3>
            <p style={{ fontSize: "12px", color: "#8a7560", lineHeight: "1.6" }}>Share your favourite reads with friends via a simple link.</p>
          </div>

          <div style={{ background: "#faf7f2", borderRadius: "10px", border: "0.5px solid #e0d5c4", padding: "1.25rem" }}>
            <div style={{ marginBottom: "0.75rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="8" stroke="#c17f3e" strokeWidth="1.3" fill="#f5ede0" />
                <path d="M9 12 Q12 8 15 12 Q12 16 9 12Z" fill="#c17f3e" opacity="0.7" />
                <circle cx="12" cy="12" r="1.5" fill="#c17f3e" />
              </svg>
            </div>
            <h3 style={{ fontSize: "13px", fontWeight: "500", color: "#1a1208", marginBottom: "4px" }}>Discover new books</h3>
            <p style={{ fontSize: "12px", color: "#8a7560", lineHeight: "1.6" }}>Find your next great read — something new always waiting to be opened.</p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "0.5px solid #e0d5c4", background: "#faf7f2", padding: "1rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "11px", color: "#a8927a" }}>© {new Date().getFullYear()} BookLog. All rights reserved.</p>
      </footer>

    </div>
  )
}
