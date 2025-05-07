"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase/client"

// Component that uses useSearchParams hook - needs to be wrapped in Suspense
function LoginForm() {
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
      // Use the same Supabase client instance that's used throughout the app
      const supabase = createClientSupabaseClient()

      // Perform login
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
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
          setIsLoading(false)
          return
        }

        if (!sessionData.session) {
          setError("Login successful but no session was created. Please try again.")
          setIsLoading(false)
          return
        }

        // Store user in localStorage as a backup
        localStorage.setItem("booklog-user", JSON.stringify(data.user))

        setStatus("Login successful! Redirecting to Books page...")

        // Force a hard navigation to books page
        window.location.href = redirectPath
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}
      {status && <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">{status}</div>}

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
  )
}

// Loading component for Suspense fallback
function LoginLoading() {
  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading login form...</p>
      </div>
    </div>
  )
}

// Main login page component
export default function LoginPage() {
  // Clear any stale auth data on component mount
  useEffect(() => {
    // Clear all authentication-related items from localStorage
    localStorage.removeItem("booklog-user")
    localStorage.removeItem("booklog-auth")
    localStorage.removeItem("supabase-auth-token")
    localStorage.removeItem("sb-access-token")
    localStorage.removeItem("sb-refresh-token")
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-bold text-blue-600">BookLog</span>
      </Link>

      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Log in to BookLog</h1>

        <Suspense fallback={<LoginLoading />}>
          <LoginForm />
        </Suspense>

        <div className="text-center">
        <p className="text-center text-sm text-gray-600">
          Don’t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
        <p className="text-center text-sm text-gray-600 mt-2">
           Forgot your password?{' '}
          <Link href="/forgot-password" className="text-blue-600 hover:underline">
            Forgot password
          </Link>
        </p>
        </div>
      </div>
    </div>
  )
}
