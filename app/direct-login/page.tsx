"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"

export default function DirectLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("Attempting to log in...")
    setError(null)

    try {
      // Create Supabase client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        setError("Missing Supabase environment variables")
        return
      }

      // Log the URL (partially) to verify it's correct
      console.log("Using Supabase URL:", supabaseUrl.substring(0, 15) + "...")

      // Create client directly without using the singleton
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          storageKey: "booklog-auth-direct",
        },
      })

      // Attempt login
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (loginError) {
        setError(`Login error: ${loginError.message}`)
        return
      }

      if (data.user) {
        setStatus("Login successful! Redirecting...")

        // Wait a moment before redirecting
        setTimeout(() => {
          window.location.href = "/basic-dashboard"
        }, 1000)
      } else {
        setError("No user returned after login")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-bold text-blue-600">BookLog</span>
      </Link>

      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Direct Login</h1>
        <p className="text-center text-gray-600">This is a simplified login page</p>

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

          <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Log in
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            <Link href="/auth-test" className="font-medium text-blue-600 hover:text-blue-500">
              Check Auth Status
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
