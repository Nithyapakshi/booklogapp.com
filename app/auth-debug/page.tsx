"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import Link from "next/link"

export default function AuthDebugPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authStatus, setAuthStatus] = useState<string>("Checking authentication...")
  const [sessionData, setSessionData] = useState<any>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClientSupabaseClient()

        // Get session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        setSessionData(sessionData)

        if (sessionError) {
          setAuthStatus(`Session error: ${sessionError.message}`)
          return
        }

        // Get user
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError) {
          setAuthStatus(`User error: ${userError.message}`)
          return
        }

        setUser(userData.user)
        setAuthStatus(userData.user ? "Authenticated" : "Not authenticated")
      } catch (err) {
        setAuthStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
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
      setAuthStatus("Signed out")
      setUser(null)
      // Force reload the page
      window.location.reload()
    } catch (err) {
      setAuthStatus(`Sign out error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Page</h1>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="font-bold">Auth Status: {authStatus}</p>
        {loading && <p>Loading...</p>}
      </div>

      {user ? (
        <div className="mb-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
            <p className="font-bold text-green-800">✅ Logged in as: {user.email}</p>
          </div>

          <button onClick={handleSignOut} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mb-4">
            Sign Out
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/dashboard" className="block p-4 bg-blue-600 text-white rounded text-center hover:bg-blue-700">
              Go to Dashboard
            </Link>
            <Link href="/" className="block p-4 bg-gray-600 text-white rounded text-center hover:bg-gray-700">
              Go to Home
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
            <p className="font-bold text-yellow-800">⚠️ Not logged in</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/login" className="block p-4 bg-blue-600 text-white rounded text-center hover:bg-blue-700">
              Go to Login
            </Link>
            <Link href="/signup" className="block p-4 bg-green-600 text-white rounded text-center hover:bg-green-700">
              Go to Signup
            </Link>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Session Data:</h2>
        <pre className="p-4 bg-gray-100 rounded overflow-auto text-xs">{JSON.stringify(sessionData, null, 2)}</pre>
      </div>

      {user && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">User Data:</h2>
          <pre className="p-4 bg-gray-100 rounded overflow-auto text-xs">{JSON.stringify(user, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
