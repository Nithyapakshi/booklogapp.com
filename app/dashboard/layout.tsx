"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { BookOpen } from "lucide-react"
import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase.auth.getUser()

        if (error || !data.user) {
          console.log("Not authenticated, redirecting to login")
          router.push("/login")
        } else {
          setUser(data.user)
        }
      } catch (err) {
        console.error("Auth check error:", err)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSignOut = async () => {
    try {
      const supabase = createClientSupabaseClient()
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
    return null // Will redirect in the useEffect
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
      <main className="flex-1">{children}</main>
    </div>
  )
}
