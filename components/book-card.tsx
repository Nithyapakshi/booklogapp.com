"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Trash2, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Book } from "@/types"
import type { BookStatus } from "@/lib/book-context"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { BookDetailsDialog } from "@/components/book-details-dialog-fix"
import { BookCardDropdown } from "@/components/book-card-dropdown"

interface BookCardProps {
  book: Book
}

export default function BookCard({ book }: BookCardProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()

    try {
      const supabase = createClientSupabaseClient()

      // Special handling for books in the "recommended" status
      if (book.status === "recommended") {
        // Instead of deleting, change status to "completed"
        const { error } = await supabase.from("books").update({ status: "completed" }).eq("id", book.id)

        if (error) {
          console.error("Error updating book status:", error)
          alert("Failed to update book. Please try again.")
          return
        }
      } else {
        // For all other statuses, delete the book as usual
        const { error } = await supabase.from("books").delete().eq("id", book.id)

        if (error) {
          console.error("Error deleting book:", error)
          alert("Failed to delete book. Please try again.")
          return
        }
      }

      // Reload the page to update the UI
      window.location.reload()
    } catch (err) {
      console.error("Error handling book removal:", err)
      alert("Failed to process your request. Please try again.")
    }
  }

  const handleMoveBook = async (toStatus: BookStatus) => {
    // Skip if the book is already in this status
    if (book.status === toStatus) return

    try {
      // Close dropdown immediately for better UX
      setDropdownOpen(false)

      // Store the target status in localStorage to restore the tab after reload
      localStorage.setItem(
        "booklog-active-tab",
        toStatus === "onHold"
          ? "On Hold"
          : toStatus === "recommended"
            ? "My recommendation"
            : toStatus.charAt(0).toUpperCase() + toStatus.slice(1),
      )

      // Update the database
      const supabase = createClientSupabaseClient()
      await supabase.from("books").update({ status: toStatus }).eq("id", book.id)

      // Reload the page to show the updated state
      window.location.reload()
    } catch (err) {
      console.error("Error moving book:", err)
      alert("Failed to move book. Please try again.")
    }
  }

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDropdownOpen(!dropdownOpen)
  }

  const handleBookClick = (e: React.MouseEvent) => {
    // Don't open dialog when clicking dropdown items
    if ((e.target as HTMLElement).closest(".book-dropdown-menu")) {
      return
    }
    setDialogOpen(true)
  }

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleBookClick}
      >
        <div className="relative h-36 w-full">
          {book.cover || book.cover_url ? (
            <img
              src={book.cover || book.cover_url || "/placeholder.svg"}
              alt={book.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                // If image fails, show a colored div with text
                const target = e.currentTarget
                target.onerror = null
                target.style.backgroundColor = "#e5e7eb"
                target.style.display = "flex"
                target.style.alignItems = "center"
                target.style.justifyContent = "center"
                target.style.color = "#6b7280"
                target.style.fontSize = "12px"
                target.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
              }}
            />
          ) : (
            <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
              No Cover
            </div>
          )}
          {isHovering && (
            <div className="absolute top-2 right-2">
              <Button variant="destructive" size="sm" onClick={handleRemove} className="h-7 w-7 p-0">
                <Trash2 size={14} />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-bold text-sm truncate">{book.title}</h3>
          <p className="text-xs text-gray-600 truncate">{book.author}</p>
          {book.genre && (
            <p className="text-xs text-purple-600 truncate mt-1 italic">{book.genre}</p>
          )}
          <div className="mt-2 flex justify-between items-center">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded capitalize">
              {book.status === "onHold" ? "On Hold" : book.status}
            </span>

            <Button ref={buttonRef} variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleDropdown}>
              <MoreHorizontal size={14} />
              <span className="sr-only">More options</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Use the BookCardDropdown component with the button element directly */}
      <BookCardDropdown
        book={book}
        isOpen={dropdownOpen}
        onClose={() => setDropdownOpen(false)}
        onMove={handleMoveBook}
        buttonElement={buttonRef.current}
      />

      {/* Book details dialog */}
      <BookDetailsDialog book={book} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="view" />
    </>
  )
}
