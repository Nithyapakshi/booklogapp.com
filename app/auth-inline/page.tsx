"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"

export default function AuthInlinePage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loginStatus, setLoginStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClientSupabaseClient()
        const { data } = await supabase.auth.getUser()
        setUser(data.user)
      } catch (err) {
        console.error("Auth check error:", err)
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
        setError(error.message)
        setLoginStatus(null)
      } else if (data.user) {
        setLoginStatus("Logged in successfully!")
        setUser(data.user)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setLoginStatus(null)
      console.error(err)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      const supabase = createClientSupabaseClient()
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      console.error("Logout error:", err)
    }
  }

  // Handle navigation
  const navigateTo = (path: string) => {
    window.location.href = path
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>

      {user ? (
        <div>
          <div className="p-4 bg-green-100 rounded mb-4">
            <p className="font-bold">You are logged in as: {user.email}</p>
          </div>

          <div className="mb-6">
            <h2 className="font-bold mb-2">User Info:</h2>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigateTo("/profile")}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Go to Profile
            </button>

            <button
              onClick={() => navigateTo("/books")}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Go to Books
            </button>

            <button onClick={handleLogout} className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700">
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-4">You are not logged in. Please sign in below:</p>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}

          {loginStatus && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">{loginStatus}</div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
