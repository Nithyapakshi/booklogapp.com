"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClientSupabaseClient()
      const { data } = await supabase.auth.getUser()
      console.log("Auth check result:", data)
      setUser(data.user)
      setLoading(false)
    }

    checkAuth()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("Logging in...")

    try {
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else if (data.user) {
        setMessage("Login successful!")
        setUser(data.user)
      }
    } catch (err) {
      setMessage(`Unexpected error: ${err}`)
    }
  }

  const handleLogout = async () => {
    const supabase = createClientSupabaseClient()
    await supabase.auth.signOut()
    setUser(null)
    setMessage("Logged out successfully")
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Auth Test</h1>

      {loading ? (
        <p>Loading...</p>
      ) : user ? (
        <div>
          <div className="p-4 bg-green-100 rounded mb-4">
            <p>Logged in as: {user.email}</p>
          </div>

          <pre className="bg-gray-100 p-4 rounded mb-4 text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>

          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
            Log Out
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-4">Not logged in</p>

          {message && <div className="p-4 bg-blue-100 rounded mb-4">{message}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-1">Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </div>

            <div>
              <label className="block mb-1">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border p-2 rounded"
                required
              />
            </div>

            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
              Log In
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
