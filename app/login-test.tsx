"use client"

import type React from "react"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import Link from "next/link"

export default function LoginTestPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("Logging in...")
    setError(null)
    setDebugInfo(null)
    setIsLoading(true)

    try {
      // Check if we have the Supabase URL and key
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      setDebugInfo({
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
      })

      if (!supabaseUrl || !supabaseKey) {
        setError("Missing Supabase environment variables")
        setIsLoading(false)
        return
      }

      const supabase = createClientSupabaseClient()

      // Basic login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      setDebugInfo((prev) => ({ ...prev, authResponse: data, authError: error }))

      if (error) {
        setError(`Login error: ${error.message}`)
      } else if (data.user) {
        setMessage("Login successful! Checking session...")

        // Check if we can get the session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        setDebugInfo((prev) => ({ ...prev, sessionData, sessionError }))

        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
        } else if (sessionData.session) {
          setMessage("Session confirmed! Redirecting...")

          // Force a hard navigation
          window.location.href = "/auth-check"
        } else {
          setError("Session not found after login")
        }
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      setDebugInfo((prev) => ({ ...prev, unexpectedError: err }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Login Test Page</h1>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-4">{error}</div>}

      {message && <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded mb-4">{message}</div>}

      <form onSubmit={handleLogin} className="space-y-4 mb-6">
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

      <div className="flex justify-between mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
        <Link href="/auth-check" className="text-blue-600 hover:underline">
          Auth Check Page
        </Link>
      </div>

      <div>
        <h2 className="font-bold mb-2">Debug Information:</h2>
        <pre className="p-4 bg-gray-100 rounded overflow-auto text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
    </div>
  )
}
