"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { BookOpen, Plus, BookMarked, BookCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { getUserFirstName } from "@/lib/user-utils"
import { useAuth } from "@/components/auth-provider"

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      setLoading(false)
    } else {
      // Check if we're still loading auth state
      setTimeout(() => {
        if (!user) {
          router.push("/login")
        }
      }, 1000)
    }
  }, [user, router])

  const handleSignOut = async () => {
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
      await supabase.auth.signOut()
      router.push("/")
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

  const firstName = getUserFirstName(user)
  const initials = firstName ? firstName.charAt(0).toUpperCase() : "U"

  return (
    <div className="container py-6">
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
    </div>
  )
}
