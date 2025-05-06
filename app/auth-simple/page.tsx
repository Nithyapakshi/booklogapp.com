"use client"

import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import Link from "next/link"

export default function AuthSimplePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleSignOut = async () => {
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
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Simple Auth Test</h1>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <div className="p-4 bg-red-100 rounded mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      ) : user ? (
        <div>
          <div className="p-4 bg-green-100 rounded mb-4">
            <p className="font-bold">✅ Authenticated as: {user.email}</p>
          </div>

          <div className="mb-4">
            <button onClick={handleSignOut} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
              Sign Out
            </button>
          </div>

          <pre className="p-4 bg-gray-100 rounded overflow-auto text-xs mb-4">{JSON.stringify(user, null, 2)}</pre>

          <div className="flex flex-col gap-2">
            <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded text-center">
              Go to Home
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-green-600 text-white rounded text-center">
              Try Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <div className="p-4 bg-yellow-100 rounded mb-4">
            <p className="font-bold">⚠️ Not authenticated</p>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded text-center">
              Go to Login
            </Link>
            <Link href="/signup" className="px-4 py-2 bg-green-600 text-white rounded text-center">
              Go to Signup
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
