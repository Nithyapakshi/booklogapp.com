"use client"

import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BookOpen, Library, Share2 } from "lucide-react"
import LearnMoreSection from "@/components/LearnMoreSection"

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClientSupabaseClient()
        const { data } = await supabase.auth.getUser()

        // Just set loading to false, don't redirect
        setLoading(false)
      } catch (err) {
        console.error("Auth check error:", err)
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:h-16 py-2 sm:py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-blue-600">BookLog</span>
          </div>
          <nav className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 pt-4 md:pt-8">
          <div className="container mx-auto flex flex-col items-center justify-center space-y-6 py-10 text-center md:py-16">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">Track your reading journey</h1>
            <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
              Manage your book collection, track your reading progress, and discover new books to read.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Get started for free
            </Link>
          <Link
            href="/learn-more"
            className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Learn more
          </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-gray-50">
        <div className="container mx-auto py-6 md:py-10">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-sm">
              <BookOpen className="h-12 w-12 mb-4 text-blue-600" />
              <h3 className="text-xl font-bold mb-2">Track Your Books</h3>
              <p className="text-gray-600">
                Keep a record of your reading progress, set goals, and never lose track of what you're reading.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-sm">
              <Library className="h-12 w-12 mb-4 text-blue-600" />
              <h3 className="text-xl font-bold mb-2">Organize Your Collection</h3>
              <p className="text-gray-600">
                Create custom shelves, categorize your books by genre, and maintain a well-organized library.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-sm">
              <Share2 className="h-12 w-12 mb-4 text-blue-600" />
              <h3 className="text-xl font-bold mb-2">Share Recommendations</h3>
              <p className="text-gray-600">
                Connect with friends, share your favorite reads, and discover new books from recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto text-center">
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} BookLog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
