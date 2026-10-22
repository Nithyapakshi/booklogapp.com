"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { GoogleSignInButton } from "@/components/google-sign-in-button"

function BookLogLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="17" width="22" height="5" rx="1.5" fill="var(--bl-c17f3e)" />
      <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="var(--bl-c17f3e)" opacity="0.62" />
      <rect x="3" y="4" width="12" height="5" rx="1.5" fill="var(--bl-c17f3e)" opacity="0.32" />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const searchParams = useSearchParams()
  const redirectPath = searchParams.get("redirect") || "/books"

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("Logging in...")
    setError(null)
    setIsLoading(true)

    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        setError("Missing Supabase environment variables")
        setIsLoading(false)
        return
      }

      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(`Login error: ${error.message}`)
        setIsLoading(false)
        return
      }

      if (data.user) {
        setStatus("Login successful! Redirecting...")
        localStorage.setItem("booklog-user", JSON.stringify(data.user))
        window.location.href = "/books"
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ background: "var(--bl-faf7f2)", fontFamily: "DM Sans, sans-serif" }}>

      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2" style={{ textDecoration: "none" }}>
        <BookLogLogo size={22} />
        <span style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "var(--bl-1a1208)", fontWeight: "normal" }}>BookLog</span>
      </Link>

      {/* Card */}
      <div className="w-full" style={{ maxWidth: "400px", background: "var(--bl-fff)", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "12px", padding: "2rem" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "var(--bl-1a1208)", fontWeight: "normal", marginBottom: "4px" }}>Welcome back</h1>
        <p style={{ fontSize: "13px", color: "var(--bl-8a7560)", marginBottom: "1.5rem" }}>Log in to your account</p>

        {error && (
          <div style={{ padding: "10px 14px", background: "var(--bl-fdf2f2)", border: "0.5px solid var(--bl-e8c4c4)", color: "var(--bl-a04040)", borderRadius: "7px", fontSize: "13px", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        {status && !error && (
          <div style={{ padding: "10px 14px", background: "var(--bl-f5ede0)", border: "0.5px solid var(--bl-e0c9a8)", color: "var(--bl-7a5530)", borderRadius: "7px", fontSize: "13px", marginBottom: "1rem" }}>
            {status}
          </div>
        )}

        <GoogleSignInButton onError={setError} />

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="email" style={{ display: "block", fontSize: "12px", color: "var(--bl-6b5c42)", fontWeight: "500", marginBottom: "4px" }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@email.com"
              style={{ width: "100%", padding: "8px 12px", border: "0.5px solid var(--bl-d4c5a9)", borderRadius: "7px", fontSize: "13px", color: "var(--bl-1a1208)", background: "var(--bl-fff)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label htmlFor="password" style={{ fontSize: "12px", color: "var(--bl-6b5c42)", fontWeight: "500" }}>
                Password
              </label>
              <a href="/forgot-password" style={{ fontSize: "12px", color: "var(--bl-c17f3e)", textDecoration: "none" }}>
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: "100%", padding: "8px 12px", border: "0.5px solid var(--bl-d4c5a9)", borderRadius: "7px", fontSize: "13px", color: "var(--bl-1a1208)", background: "var(--bl-fff)", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ width: "100%", padding: "10px", background: isLoading ? "var(--bl-d4a574)" : "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "500", cursor: isLoading ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif" }}
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--bl-8a7560)", marginTop: "1.25rem" }}>
          Don't have an account?{" "}
          <Link href="/signup" style={{ color: "var(--bl-c17f3e)", textDecoration: "none", fontWeight: "500" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
