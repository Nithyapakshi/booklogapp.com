"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import Link from "next/link"

export default function AuthCheckPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClientSupabaseClient()

        // Check if we have the Supabase URL and key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        setDebugInfo({
          hasSupabaseUrl: !!supabaseUrl,
          hasSupabaseKey: !!supabaseKey,
        })

        // Get session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
          setDebugInfo((prev) => ({ ...prev, sessionError }))
          return
        }

        setDebugInfo((prev) => ({ ...prev, session: sessionData }))

        // Get user
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError) {
          setError(`User error: ${userError.message}`)
          setDebugInfo((prev) => ({ ...prev, userError }))
          return
        }

        setUser(userData.user)
        setDebugInfo((prev) => ({ ...prev, user: userData.user }))
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
        setDebugInfo((prev) => ({ ...prev, error: err }))
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
      setDebugInfo((prev) => ({ ...prev, signedOut: true }))
      // Force reload the page
      window.location.reload()
    } catch (err) {
      setError(`Sign out error: ${err instanceof Error ? err.message : String(err)}`)
      setDebugInfo((prev) => ({ ...prev, signOutError: err }))
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Authentication Check Page</h1>

      {loading ? (
        <p>Loading authentication state...</p>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-4">
          <p>{error}</p>
        </div>
      ) : user ? (
        <div>
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded mb-4">
            <p className="font-bold">✅ Authenticated as: {user.email}</p>
          </div>

          <button onClick={handleSignOut} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mb-4">
            Sign Out
          </button>

          <div className="flex flex-col gap-2 mb-4">
            <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded text-center">
              Try Dashboard
            </Link>
            <Link href="/" className="px-4 py-2 bg-gray-600 text-white rounded text-center">
              Go to Home
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded mb-4">
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

      <div className="mt-6">
        <h2 className="font-bold mb-2">Debug Information:</h2>
        <pre className="p-4 bg-gray-100 rounded overflow-auto text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
    </div>
  )
}
