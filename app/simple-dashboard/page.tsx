"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/supabase-client"
import Link from "next/link"
import { BookOpen, Plus, BookMarked, BookCheck } from "lucide-react"

export default function SimpleDashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check authentication status
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
      window.location.href = "/"
    } catch (err) {
      console.error("Sign out error:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <p className="text-lg mb-4">Loading authentication state...</p>
          <p className="text-sm text-gray-500">If this takes too long, try refreshing the page.</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="mb-6">You need to be logged in to view the dashboard.</p>
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
            <Link href="/simple-dashboard" className="text-sm font-medium text-gray-900">
              Dashboard
            </Link>
            <Link href="/books" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              My Books
            </Link>
            <Link href="/auth-test" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Auth Test
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
          <h1 className="text-3xl font-bold">Simple Dashboard</h1>
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
          <p className="mb-2">Last Sign In: {new Date(user.last_sign_in_at).toLocaleString()}</p>
        </div>
      </main>
    </div>
  )
}
