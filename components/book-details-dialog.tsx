"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import type { BookSearchResult } from "@/lib/google-books-api"
import { ChevronDown } from "lucide-react"

interface BookDetailsDialogProps {
  book: BookSearchResult | null
  open: boolean
  onClose: () => void
  mode?: "add" | "view" | "edit"
}

export function BookDetailsDialog({ book, open, onClose, mode = "add" }: BookDetailsDialogProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>("Currently Reading")
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  const statusOptions = ["Currently Reading", "Want to Read", "Completed", "On Hold", "Recommend"]

  // Function to sanitize HTML content
  const sanitizeDescription = (html: string | undefined) => {
    if (!html) return "No description available."

    // Simple sanitization - strip HTML tags
    return html.replace(/<[^>]*>?/gm, "")
  }

  const handleAddToCollection = async () => {
    if (!book) return

    setIsAdding(true)
    setError(null)
    setSuccess(null)

    // Map UI status to database status
    const dbStatus =
      selectedStatus === "Currently Reading"
        ? "reading"
        : selectedStatus === "Want to Read"
          ? "queued"
          : selectedStatus === "Completed"
            ? "completed"
            : selectedStatus === "On Hold"
              ? "onHold"
              : selectedStatus === "Recommend"
                ? "recommended"
                : "reading"

    console.log("Adding book to collection with status:", dbStatus)

    try {
      const supabase = createClientSupabaseClient()

      // Get the current user directly from supabase auth
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        throw new Error("Authentication failed. Please log in again.")
      }

      const currentUserId = userData.user.id
      console.log("Using user ID for book insertion:", currentUserId)

      // Generate a proper UUID
      const bookId = crypto.randomUUID()

      // Add the book directly to Supabase
      const { error: insertError } = await supabase.from("books").insert({
        id: bookId,
        title: book.title,
        author: book.author,
        cover_url: book.cover, // Using cover_url instead of cover
        status: dbStatus,
        description: sanitizeDescription(book.description),
        user_id: currentUserId,
        published_year:
          typeof book.published_year === "string" ? Number.parseInt(book.published_year) : book.published_year,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("Insert error:", insertError)
        throw new Error(`Failed to add book: ${insertError.message}`)
      }

      setSuccess("Book added successfully!")

      // Store the active tab in localStorage
      localStorage.setItem(
        "booklog-active-tab",
        dbStatus === "onHold"
          ? "On Hold"
          : dbStatus === "recommended"
            ? "My recommendation"
            : dbStatus.charAt(0).toUpperCase() + dbStatus.slice(1),
      )

      // Close dialog after a short delay
      setTimeout(() => {
        onClose()
        // Reload the page to show the new book
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error("Error adding book:", error)
      setError(error instanceof Error ? error.message : "Failed to add book. Please try again.")
    } finally {
      setIsAdding(false)
    }
  }

  if (!open || !book) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span className="sr-only">Close</span>
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">{book.title}</h2>
          <p className="text-gray-600 text-lg mb-6">{book.author}</p>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Book cover on the left */}
            <div className="w-full md:w-1/3">
              {book.cover ? (
                <img
                  src={book.cover || "/placeholder.svg"}
                  alt={book.title}
                  className="w-full h-auto object-cover rounded-md shadow-md"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center rounded-md shadow-md">
                  <span className="text-gray-500">No Cover</span>
                </div>
              )}
            </div>

            {/* Book details on the right */}
            <div className="w-full md:w-2/3">
              <h3 className="text-xl font-bold mb-2">Description</h3>
              <p className="text-gray-700 mb-8">{sanitizeDescription(book.description)}</p>

              {mode === "add" && (
                <>
                  <h3 className="text-lg font-medium mb-3">Add to your collection</h3>

                  {/* Status dropdown */}
                  <div className="relative mb-4">
                    <div
                      className="w-full border rounded-md p-3 flex justify-between items-center cursor-pointer"
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    >
                      <span>{selectedStatus}</span>
                      <ChevronDown className="h-5 w-5" />
                    </div>

                    {showStatusDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                        {statusOptions.map((status) => (
                          <div
                            key={status}
                            className="p-3 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setSelectedStatus(status)
                              setShowStatusDropdown(false)
                            }}
                          >
                            {status}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {error && <div className="text-red-500 mb-3">{error}</div>}
                  {success && <div className="text-green-500 mb-3">{success}</div>}

                  <Button className="w-full py-6 text-lg" onClick={handleAddToCollection} disabled={isAdding}>
                    {isAdding ? "Adding..." : "Add to Collection"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
