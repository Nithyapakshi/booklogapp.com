"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"

export default function LoginDirectPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const router = useRouter()

  useEffect(() => {
    // Redirect to the main login page
    router.replace("/login")
  }, [router])

  // This will automatically redirect users away from login-direct

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("Logging in...")
    setError(null)
    setDebugInfo(null)
    setIsLoading(true)

    try {
      // Create a fresh Supabase client for this login attempt
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        setError("Missing Supabase environment variables")
        setIsLoading(false)
        return
      }

      // Import directly to avoid any issues with singleton
      const { createClient } = await import("@supabase/supabase-js")

      // Create a new client with explicit auth options
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: "supabase-auth-token",
        },
      })

      // Basic login
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
        setStatus("Login successful! Checking session...")

        // Verify the session was created
        const { data: sessionData } = await supabase.auth.getSession()

        setDebugInfo({
          user: {
            id: data.user.id,
            email: data.user.email,
          },
          session: sessionData.session
            ? {
                expires_at: sessionData.session.expires_at,
                token_type: sessionData.session.token_type,
              }
            : null,
        })

        if (sessionData.session) {
          setStatus("Session confirmed! Redirecting to books page...")

          // Use a direct navigation approach
          setTimeout(() => {
            // Force a hard navigation to books page
            window.location.href = "/books"
          }, 1000)
        } else {
          setError("Session not found after login. Please try again.")
          setIsLoading(false)
        }
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      setDebugInfo({ unexpectedError: String(err) })
      setIsLoading(false)
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
        <p className="text-center text-gray-600">This login bypasses the redirect system</p>

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
          <p className="text-sm text-gray-600">
            <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
              Back to Home
            </Link>
          </p>
        </div>

        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="text-sm font-medium mb-2">Debug Info:</h3>
            <pre className="text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
