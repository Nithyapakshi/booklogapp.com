"use client"

import type React from "react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { createClientSupabaseClient } from "@/lib/supabase/client"

function BookLogLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="17" width="22" height="5" rx="1.5" fill="#c17f3e" />
      <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="#c17f3e" opacity="0.62" />
      <rect x="3" y="4" width="12" height="5" rx="1.5" fill="#c17f3e" opacity="0.32" />
    </svg>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "0.5px solid #d4c5a9",
  borderRadius: "7px",
  fontSize: "13px",
  color: "#1a1208",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "DM Sans, sans-serif",
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "#6b5c42",
  fontWeight: "500",
  marginBottom: "4px",
}

export default function SignupPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const router = useRouter()
  const { signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await signUp(email, password)

      if (error) {
        setError(error.message)
      } else if (data.user) {
        setMessage("Account created successfully! Redirecting...")

        try {
          const supabase = createClientSupabaseClient()
          await supabase.auth.updateUser({
            data: { first_name: firstName, last_name: lastName },
          })
          await supabase.from("profiles").update({ name: firstName }).eq("user_id", data.user.id)
        } catch (err) {
          console.error("Failed to update user metadata:", err)
        }

        setTimeout(() => {
          router.push("/books")
        }, 1500)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4" style={{ background: "#faf7f2", fontFamily: "DM Sans, sans-serif" }}>

      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2" style={{ textDecoration: "none" }}>
        <BookLogLogo size={22} />
        <span style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#1a1208", fontWeight: "normal" }}>BookLog</span>
      </Link>

      {/* Card */}
      <div className="w-full" style={{ maxWidth: "400px", background: "#fff", border: "0.5px solid #e0d5c4", borderRadius: "12px", padding: "2rem" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "22px", color: "#1a1208", fontWeight: "normal", marginBottom: "4px" }}>Create your account</h1>
        <p style={{ fontSize: "13px", color: "#8a7560", marginBottom: "1.5rem" }}>Start tracking your reading today</p>

        {error && (
          <div style={{ padding: "10px 14px", background: "#fdf2f2", border: "0.5px solid #e8c4c4", color: "#a04040", borderRadius: "7px", fontSize: "13px", marginBottom: "1rem" }}>
            {error}
          </div>
        )}
        {message && (
          <div style={{ padding: "10px 14px", background: "#f5ede0", border: "0.5px solid #e0c9a8", color: "#7a5530", borderRadius: "7px", fontSize: "13px", marginBottom: "1rem" }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* First / Last name row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1rem" }}>
            <div>
              <label htmlFor="first-name" style={labelStyle}>First name</label>
              <input id="first-name" name="first-name" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="last-name" style={labelStyle}>Last name</label>
              <input id="last-name" name="last-name" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="confirm-password" style={labelStyle}>Confirm password</label>
            <input id="confirm-password" name="confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ width: "100%", padding: "10px", background: isLoading ? "#d4a574" : "#c17f3e", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "500", cursor: isLoading ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif" }}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "12px", color: "#8a7560", marginTop: "1.25rem" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "#c17f3e", textDecoration: "none", fontWeight: "500" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
