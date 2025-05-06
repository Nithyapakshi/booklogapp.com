"use client"

import { useState } from "react"
import { mapTabToStatus } from "@/lib/book-context"
import BookCard from "@/components/book-card-sync"
import BookSearch from "@/components/book-search"
import { AiRecommendationCard } from "@/components/ai-recommendation-card"
import { Button } from "@/components/ui/button"
import { RefreshCw, LogOut } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { AuthDebug } from "@/components/auth-debug"
import { RLSPolicyDebug } from "@/components/rls-policy-debug"
import { useAuth } from "@/components/auth/auth-provider"
import { getUserFirstName } from "@/lib/user-utils"
import { useBooks } from "@/hooks/use-books"
import type { BookStatus } from "@/hooks/use-books"
import BookTableView from "@/components/BookTableView"

export default function BooksPage() {
  const [activeTab, setActiveTab] = useState("Reading")
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [isTableView, setIsTableView] = useState(false)

  const supabase = createClientSupabaseClient()
  const router = useRouter()
  const { user } = useAuth()
  const { books, getBooksByStatus, refetchBooks } = useBooks(user?.id || null)

  const isDevelopment = process.env.NODE_ENV === "development"
  const firstName = getUserFirstName(user)
  const initials = firstName.charAt(0).toUpperCase() || "U"
  const currentStatus = mapTabToStatus(activeTab)
  const booksToDisplay = getBooksByStatus(currentStatus)

  const getBookCountByStatus = (status: BookStatus) => getBooksByStatus(status).length
  const handleReload = async () => await refetchBooks()
  const handleBookMoved = async () => await refetchBooks()

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await supabase.auth.signOut()
      localStorage.removeItem("supabase-auth-token")
      localStorage.removeItem("booklog-auth")
      localStorage.removeItem("booklog-user")
      window.location.href = "/"
    } catch (err) {
      console.error("Sign out error:", err)
      alert("Failed to sign out. Please try again.")
    } finally {
      setIsSigningOut(false)
    }
  }

  const tabs = [
    { name: "Reading", count: getBookCountByStatus("reading") },
    { name: "Queued", count: getBookCountByStatus("queued") },
    { name: "Completed", count: getBookCountByStatus("completed") },
    { name: "My recommendation", count: getBookCountByStatus("recommended") },
    { name: "On Hold", count: getBookCountByStatus("onHold") },
  ]

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Books</h1>
        <div className="flex items-center gap-3">
          {isDevelopment && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)}>
                {showDebug ? "Hide Debug" : "Show Debug"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleReload}>
                <RefreshCw className="h-4 w-4" />
                Reload Books
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
            <LogOut className="h-4 w-4" />
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </Button>
          <span className="text-lg font-medium">{firstName}</span>
          <div className="rounded-full h-10 w-10 bg-blue-600 text-white flex items-center justify-center">
            {initials}
          </div>
        </div>
      </div>

      {showDebug && isDevelopment && (
        <div className="mb-6">
          <AuthDebug />
          <div className="mt-4">
            <RLSPolicyDebug />
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-3/4">
          {/* Search and Toggle Row */}
          <div className="flex justify-between items-center mb-4 flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <BookSearch setUpdateCounter={handleBookMoved} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Grid View</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isTableView}
                  onChange={() => setIsTableView(!isTableView)}
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
              <span className="text-sm font-medium">Table View</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <ul className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <li
                  key={tab.name}
                  className={`cursor-pointer px-4 py-2 rounded-md ${
                    activeTab === tab.name ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  onClick={() => setActiveTab(tab.name)}
                >
                  {tab.name} ({tab.count})
                </li>
              ))}
            </ul>
          </div>

          {/* Content */}
          {booksToDisplay.length > 0 ? (
            isTableView ? (
              <BookTableView books={booksToDisplay} onBookMoved={handleBookMoved} />
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative"
                style={{ zIndex: 20 }}
              >
                {booksToDisplay.map((book) => (
                  <BookCard key={book.id} book={book} onBookMoved={handleBookMoved} />
                ))}
              </div>
            )
          ) : (
            <div className="flex justify-center items-center h-64 text-gray-500">
              No books found in this category
            </div>
          )}
        </div>

        <div className="lg:w-1/4 pt-[60px]">
          <div className="sticky top-6">
            <AiRecommendationCard />
          </div>
        </div>
      </div>
    </div>
  )
}
