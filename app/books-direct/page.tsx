"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BookOpen, Plus, BookMarked, BookCheck } from "lucide-react"

export default function BooksDirectPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        setDebugInfo({ step: "Starting auth check" })

        // First check localStorage for a backup user
        const localUser = localStorage.getItem("booklog-user")

        // Import directly to avoid any issues with singleton
        const { createClient } = await import("@supabase/supabase-js")

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          setError("Missing Supabase environment variables")
          setDebugInfo((prev) => ({
            ...prev,
            error: "Missing environment variables",
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
          }))
          setLoading(false)
          return
        }

        // Create a new client with explicit auth options
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            storage: {
              getItem: (key) => localStorage.getItem(key),
              setItem: (key, value) => localStorage.setItem(key, value),
              removeItem: (key) => localStorage.removeItem(key),
            },
          },
        })

        setDebugInfo((prev) => ({ ...prev, step: "Checking session" }))

        // Get session
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error("Session error:", error)
          setDebugInfo((prev) => ({ ...prev, sessionError: error.message }))
        } else if (data.session) {
          console.log("User authenticated via session")
          setUser(data.session.user)
          setDebugInfo((prev) => ({
            ...prev,
            step: "User authenticated via session",
            user: {
              id: data.session.user.id,
              email: data.session.user.email,
            },
          }))
        } else if (localUser) {
          // Try to use the backup user from localStorage
          console.log("Using backup user from localStorage")
          try {
            const parsedUser = JSON.parse(localUser)
            setUser(parsedUser)
            setDebugInfo((prev) => ({
              ...prev,
              step: "Using backup user from localStorage",
              user: {
                id: parsedUser.id,
                email: parsedUser.email,
              },
            }))
          } catch (err) {
            console.error("Failed to parse backup user:", err)
            setDebugInfo((prev) => ({ ...prev, backupUserError: String(err) }))
          }
        } else {
          console.log("No user found")
          setDebugInfo((prev) => ({ ...prev, step: "No user found" }))
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setError(err instanceof Error ? err.message : String(err))
        setDebugInfo((prev) => ({ ...prev, unexpectedError: String(err) }))
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleSignOut = async () => {
    try {
      // Clear localStorage backup
      localStorage.removeItem("booklog-user")

      // Import directly to avoid any issues with singleton
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (err) {
      console.error("Sign out error:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <p className="text-lg mb-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="mb-6">You need to be logged in to view this page.</p>
          <div className="space-y-4">
            <Link href="/login" className="block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Go to Login
            </Link>
            {debugInfo && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <h2 className="font-bold mb-2">Debug Info:</h2>
                <pre className="text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-blue-600">BookLog</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/books-direct" className="text-sm font-medium text-gray-900">
              My Books
            </Link>
            <button onClick={handleSignOut} className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Sign Out
            </button>
            <div className="rounded-full h-8 w-8 bg-blue-600 text-white flex items-center justify-center">
              {user.email?.charAt(0).toUpperCase() || "U"}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Books</h1>
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" /> Add Book
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-gray-500">Currently Reading</h2>
              <BookOpen className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">3 Books</p>
            <p className="text-xs text-gray-500">+1 from last month</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-gray-500">Books Read</h2>
              <BookCheck className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">24 Books</p>
            <p className="text-xs text-gray-500">+3 from last month</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-gray-500">Want to Read</h2>
              <BookMarked className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">12 Books</p>
            <p className="text-xs text-gray-500">+2 from last month</p>
          </div>
        </div>

        {/* User Info */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">User Information</h2>
          <p className="mb-2">Email: {user.email}</p>
          <p className="mb-2">User ID: {user.id}</p>
          {user.last_sign_in_at && (
            <p className="mb-2">Last Sign In: {new Date(user.last_sign_in_at).toLocaleString()}</p>
          )}
        </div>
      </main>
    </div>
  )
}
