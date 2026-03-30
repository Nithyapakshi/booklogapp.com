"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { useSearchParams } from "next/navigation"

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

      // Create a new client with explicit auth options
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      })

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
        setStatus("Login successful! Redirecting to Books page...")

        // Store user in localStorage as a backup
        localStorage.setItem("booklog-user", JSON.stringify(data.user))

        // Force a hard navigation to books page
        window.location.href = "/books"
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
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
        <h1 className="text-2xl font-bold text-center">Log in to BookLog</h1>

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
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
