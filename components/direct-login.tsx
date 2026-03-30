"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@supabase/supabase-js"

export default function DirectLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("Logging in...")
    setError(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        setError("Missing Supabase environment variables")
        return
      }

      const supabase = createClient(supabaseUrl, supabaseKey)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setStatus(null)
      } else if (data.user) {
        setStatus("Logged in successfully! Refreshing page...")

        // Refresh the page after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setStatus(null)
      console.error(err)
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">Login Required</h2>
      <p className="mb-4">Please log in to view this page.</p>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}

      {status && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">{status}</div>}

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
          Log in
        </button>
      </form>
    </div>
  )
}
