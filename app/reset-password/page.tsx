"use client"

import { useState, useEffect } from "react"
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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const { createClient } = require("@supabase/supabase-js")
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") {
        // Session is now active — user can set new password
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.href = "/books"
      }, 2000)
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ background: "#faf7f2", fontFamily: "DM Sans, sans-serif" }}>

      <Link href="/" className="mb-8 flex items-center gap-2" style={{ textDecoration: "none" }}>
        <BookLogLogo size={22} />
        <span style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#1a1208", fontWeight: "normal" }}>BookLog</span>
      </Link>

      <div className="w-full" style={{ maxWidth: "400px", background: "#fff", border: "0.5px solid #e0d5c4", borderRadius: "12px", padding: "2rem" }}>

        {!success ? (
          <>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#1a1208", fontWeight: "normal", marginBottom: "4px" }}>Set new password</h1>
            <p style={{ fontSize: "13px", color: "#8a7560", marginBottom: "1.5rem" }}>Choose a new password for your account</p>

            {error && (
              <div style={{ padding: "10px 14px", background: "#fdf2f2", border: "0.5px solid #e8c4c4", color: "#a04040", borderRadius: "7px", fontSize: "13px", marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="password" style={{ display: "block", fontSize: "12px", color: "#6b5c42", fontWeight: "500", marginBottom: "4px" }}>
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "8px 12px", border: "0.5px solid #d4c5a9", borderRadius: "7px", fontSize: "13px", color: "#1a1208", background: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label htmlFor="confirm" style={{ display: "block", fontSize: "12px", color: "#6b5c42", fontWeight: "500", marginBottom: "4px" }}>
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "8px 12px", border: "0.5px solid #d4c5a9", borderRadius: "7px", fontSize: "13px", color: "#1a1208", background: "#fff", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{ width: "100%", padding: "10px", background: isLoading ? "#d4a574" : "#c17f3e", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "500", cursor: isLoading ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif" }}
              >
                {isLoading ? "Updating..." : "Update password"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#1a1208", fontWeight: "normal", marginBottom: "4px" }}>Password updated</h1>
            <p style={{ fontSize: "13px", color: "#8a7560", marginBottom: "1.5rem" }}>
              Your password has been changed. Redirecting to your books...
            </p>
            <Link
              href="/books"
              style={{ display: "block", width: "100%", padding: "10px", background: "#c17f3e", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "500", textAlign: "center", textDecoration: "none", fontFamily: "DM Sans, sans-serif", boxSizing: "border-box" }}
            >
              Go to my books
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
