"use client"

import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { BookOpen } from "lucide-react"
import { usePathname } from "next/navigation"

export default function DashboardHeader() {
  const { signOut, user } = useAuth()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut()
    window.location.href = "/"
  }

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold text-blue-600">BookLog</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/books"
            className={`text-sm font-medium ${pathname === "/books" || pathname?.startsWith("/books/") ? "text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
          >
            My Books
          </Link>
          <Link
            href="/dashboard"
            className={`text-sm font-medium ${pathname === "/dashboard" ? "text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
          >
            Dashboard
          </Link>
          <Link
            href="/profile"
            className={`text-sm font-medium ${pathname === "/profile" ? "text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
          >
            Profile
          </Link>
          <button onClick={handleSignOut} className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Sign Out
          </button>
          <div className="rounded-full h-8 w-8 bg-blue-600 text-white flex items-center justify-center">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
        </nav>
      </div>
    </header>
  )
}
