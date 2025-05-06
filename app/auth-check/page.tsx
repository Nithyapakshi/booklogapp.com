"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function AuthCheckPage() {
  const [authStatus, setAuthStatus] = useState<string>("Checking authentication...")
  const [user, setUser] = useState<any>(null)
  const [cookies, setCookies] = useState<string>("")
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        // Import directly to avoid any issues with singleton
        const { createClient } = await import("@supabase/supabase-js")

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          setAuthStatus("Missing Supabase environment variables")
          setDebugInfo({
            error: "Missing environment variables",
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseKey: !!supabaseKey,
          })
          return
        }

        // Create a new client
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: "supabase-auth-token",
          },
        })

        // Get cookies for debugging
        setCookies(document.cookie)
        setDebugInfo((prev) => ({
          ...prev,
          cookies: document.cookie.split(";").map((c) => c.trim()),
        }))

        // Check session
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          setAuthStatus(`Error: ${error.message}`)
          setDebugInfo((prev) => ({
            ...prev,
            sessionError: error.message,
          }))
        } else if (data.session) {
          setAuthStatus("Authenticated")
          setUser(data.session.user)
          setDebugInfo((prev) => ({
            ...prev,
            session: {
              expires_at: data.session.expires_at,
              user: {
                id: data.session.user.id,
                email: data.session.user.email,
              },
            },
          }))
        } else {
          setAuthStatus("Not authenticated")
          setDebugInfo((prev) => ({
            ...prev,
            noSession: true,
          }))
        }
      } catch (err) {
        setAuthStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
        setDebugInfo((prev) => ({
          ...prev,
          unexpectedError: String(err),
        }))
      }
    }

    checkAuth()
  }, [])

  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Authentication Check</h1>
      <p className="text-gray-700 mb-4">Status: {authStatus}</p>

      {user && (
        <div className="p-4 bg-green-100 rounded mb-4">
          <p className="font-bold">Logged in as: {user.email}</p>
          <pre className="mt-4 bg-gray-100 p-2 rounded text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
        </div>
      )}

      <div className="p-4 bg-yellow-100 rounded mb-4">
        <h2 className="font-bold mb-2">Cookies:</h2>
        <p className="text-xs break-all">{cookies || "No cookies found"}</p>
      </div>

      <div className="p-4 bg-blue-100 rounded mb-4">
        <h2 className="font-bold mb-2">Debug Info:</h2>
        <pre className="text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>

      <div className="flex space-x-4">
        <Link href="/login" className="text-blue-600 hover:underline">
          Go to Login
        </Link>
        <Link href="/books" className="text-blue-600 hover:underline">
          Go to Books
        </Link>
      </div>
    </div>
  )
}
