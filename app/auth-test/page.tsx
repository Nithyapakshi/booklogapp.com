"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import Link from "next/link"

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginStatus, setLoginStatus] = useState<string | null>(null)

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase.auth.getUser()

        if (error) {
          setError(error.message)
        } else {
          setUser(data.user)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginStatus("Logging in...")
    setError(null)

    try {
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setLoginStatus(null)
        setError(error.message)
      } else if (data.user) {
        setLoginStatus("Login successful!")
        setUser(data.user)

        // Reload the page after successful login
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setLoginStatus(null)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      const supabase = createClientSupabaseClient()
      await supabase.auth.signOut()
      setUser(null)

      // Reload the page after logout
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-4">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {user ? (
        <div>
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded mb-4">
            <p className="font-bold">✅ Authenticated as: {user.email}</p>
          </div>

          <div className="mb-6">
            <h2 className="font-bold mb-2">User Info:</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">{JSON.stringify(user, null, 2)}</pre>
          </div>

          <button onClick={handleLogout} className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
            Sign Out
          </button>
        </div>
      ) : (
        <div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded mb-4">
            <p className="font-bold">⚠️ Not authenticated</p>
          </div>

          {loginStatus && (
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded mb-4">{loginStatus}</div>
          )}

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

            <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Log in
            </button>
          </form>
        </div>
      )}

      <div className="mt-6">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
