"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BookOpen, Plus, BookMarked, BookCheck } from "lucide-react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
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
          console.error("Auth error:", error)
          setLoading(false)
        } else if (data.user) {
          setUser(data.user)
          setLoading(false)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error("Unexpected error:", err)
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    try {
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
          <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Go to Login
          </Link>
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
            <Link href="/dashboard" className="text-sm font-medium text-gray-900">
              Dashboard
            </Link>
            <Link href="/books" className="text-sm font-medium text-gray-600 hover:text-gray-900">
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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link
            href="/books/add"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Book
          </Link>
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

        <div className="mt-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                Currently Reading
              </button>
              <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                Completed
              </button>
              <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                Want to Read
              </button>
            </nav>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((book) => (
              <div key={book} className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-bold">The Great Gatsby</h3>
                <p className="text-sm text-gray-500 mb-4">F. Scott Fitzgerald</p>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress: 65%</span>
                  <span>180/276 pages</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "65%" }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
