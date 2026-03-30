"use client"

import type React from "react"

import { useState } from "react"
import { createDebugSupabaseClient } from "@/lib/supabase-debug"
import Link from "next/link"

export default function DebugLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("Logging in...")
    setError(null)
    setIsLoading(true)

    try {
      console.log("Creating Supabase client for login...")
      const supabase = createDebugSupabaseClient()

      console.log("Attempting login with email:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Login error:", error)
        setError(error.message)
        setStatus(null)
      } else if (data.user) {
        console.log("Login successful:", data.user)
        setStatus("Login successful! Redirecting...")

        // Check session immediately after login
        const { data: sessionData } = await supabase.auth.getSession()
        console.log("Session after login:", sessionData)

        // Force a hard navigation to the debug auth page
        setTimeout(() => {
          window.location.href = "/debug/auth"
        }, 1000)
      }
    } catch (err) {
      console.error("Unexpected error during login:", err)
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Debug Login</h1>
        <p className="text-center text-gray-600">This is a simplified login page for debugging</p>

        {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}
        {status && <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">{status}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="text-center">
          <Link href="/debug/auth" className="font-medium text-blue-600 hover:text-blue-500">
            Check Auth Status
          </Link>
        </div>
      </div>
    </div>
  )
}
