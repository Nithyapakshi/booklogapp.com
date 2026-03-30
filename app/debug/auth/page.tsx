"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import Link from "next/link"

export default function DebugAuthPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [envVars, setEnvVars] = useState<any>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginStatus, setLoginStatus] = useState<string | null>(null)

  // Check environment variables
  useEffect(() => {
    async function checkEnv() {
      try {
        const response = await fetch("/api/debug/env")
        const data = await response.json()
        setEnvVars(data.envVars)
      } catch (err) {
        console.error("Failed to fetch environment variables:", err)
      }
    }

    checkEnv()
  }, [])

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        console.log("Checking authentication status...")
        const supabase = createClientSupabaseClient()

        // Log the Supabase URL and key (partially masked)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        console.log("Supabase URL:", supabaseUrl ? `${supabaseUrl.substring(0, 8)}...` : "missing")
        console.log("Supabase Key:", supabaseKey ? "exists" : "missing")

        const { data, error } = await supabase.auth.getUser()

        if (error) {
          console.error("Auth error:", error)
          setError(error.message)
        } else {
          console.log("Auth data:", data)
          setUser(data.user)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
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

      console.log("Attempting login with:", email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Login error:", error)
        setLoginStatus(null)
        setError(error.message)
      } else if (data.user) {
        console.log("Login successful:", data.user)
        setLoginStatus("Login successful! User: " + data.user.email)
        setUser(data.user)

        // Force page reload after successful login
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (err) {
      console.error("Unexpected login error:", err)
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
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug Page</h1>

      {/* Environment Variables Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Environment Variables</h2>
        {envVars ? (
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">{JSON.stringify(envVars, null, 2)}</pre>
        ) : (
          <p>Loading environment variables...</p>
        )}
      </div>

      {/* Authentication Status Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Authentication Status</h2>

        {loading ? (
          <p>Checking authentication status...</p>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-4">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        ) : user ? (
          <div>
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded mb-4">
              <p className="font-bold">✅ Authenticated as: {user.email}</p>
            </div>

            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mb-4">
              Sign Out
            </button>

            <div className="mt-4">
              <h3 className="font-bold mb-2">User Data:</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">{JSON.stringify(user, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded mb-4">
            <p className="font-bold">⚠️ Not authenticated</p>
          </div>
        )}
      </div>

      {/* Login Form Section */}
      {!user && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border">
          <h2 className="text-xl font-bold mb-4">Test Login</h2>

          {loginStatus && (
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded mb-4">{loginStatus}</div>
          )}

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

            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Log In
            </button>
          </form>
        </div>
      )}

      {/* Navigation Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/" className="p-4 bg-gray-200 rounded text-center hover:bg-gray-300">
          Home Page
        </Link>
        <Link href="/dashboard" className="p-4 bg-blue-600 text-white rounded text-center hover:bg-blue-700">
          Dashboard
        </Link>
        <Link href="/login" className="p-4 bg-green-600 text-white rounded text-center hover:bg-green-700">
          Login Page
        </Link>
        <Link href="/signup" className="p-4 bg-purple-600 text-white rounded text-center hover:bg-purple-700">
          Signup Page
        </Link>
      </div>
    </div>
  )
}
