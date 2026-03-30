"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function BasicDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        // Import directly to avoid any issues with singleton
        const { createClient } = await import("@supabase/supabase-js")

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          setError("Missing Supabase environment variables")
          setLoading(false)
          return
        }

        const supabase = createClient(supabaseUrl, supabaseKey)
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

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <div className="p-4 bg-red-100 rounded mb-4">{error}</div>
        <Link href="/direct-login" className="text-blue-600 hover:underline">
          Go to Login
        </Link>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Not Authenticated</h1>
        <p className="mb-4">You need to log in to view this page.</p>
        <Link href="/direct-login" className="text-blue-600 hover:underline">
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Basic Dashboard</h1>

      <div className="p-4 bg-green-100 rounded mb-4">
        <p className="font-bold">✅ Logged in as: {user.email}</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 mb-6">
        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-bold mb-2">Currently Reading</h2>
          <p className="text-2xl">3 Books</p>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-bold mb-2">Completed</h2>
          <p className="text-2xl">24 Books</p>
        </div>

        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-bold mb-2">Want to Read</h2>
          <p className="text-2xl">12 Books</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link href="/auth-test" className="px-4 py-2 bg-blue-600 text-white rounded">
          Go to Auth Test
        </Link>

        <button
          onClick={async () => {
            const { createClient } = await import("@supabase/supabase-js")
            const supabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            )
            await supabase.auth.signOut()
            window.location.reload()
          }}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
