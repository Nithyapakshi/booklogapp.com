"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Trash2, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Book } from "@/types"
import { useBooks, type BookStatus } from "@/lib/book-context"
import { BookDetailsDialog } from "@/components/book-details-dialog"

interface BookCardProps {
  book: Book
  removeBook: (id: string) => void
}

export default function BookCard({ book, removeBook }: BookCardProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { addBook } = useBooks()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [dropdownOpen])

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeBook(book.id)
  }

  const moveBook = (status: BookStatus) => {
    // Skip if the book is already in this status
    if (book.status === status) return

    // Add the book to the new status (this will move it from the old status)
    addBook(book, status)

    // Close dropdown after action
    setDropdownOpen(false)
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
        className="bg-white rounded-lg shadow-md overflow-hidden relative cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleBookClick}
      >
        <div className="relative h-36 w-full">
          {book.cover ? (
            <img
              src={book.cover || "/placeholder.svg"}
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
          <div className="mt-2 flex justify-between items-center">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded capitalize">
              {book.status}
            </span>

            <div className="relative book-dropdown-menu">
              <Button ref={buttonRef} variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleDropdown}>
                <MoreHorizontal size={14} />
                <span className="sr-only">More options</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown menu rendered at the end of the component to avoid clipping */}
      {dropdownOpen && buttonRef.current && (
        <div
          ref={dropdownRef}
          className="fixed bg-white rounded-md shadow-lg border border-gray-200 py-1 z-[9999] w-40 book-dropdown-menu"
          style={{
            top: `${buttonRef.current.getBoundingClientRect().bottom + window.scrollY}px`,
            left: `${buttonRef.current.getBoundingClientRect().left + window.scrollX - 120}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {book.status !== "reading" && (
            <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("reading")}>
              Move to Reading
            </div>
          )}
          {book.status !== "queued" && (
            <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("queued")}>
              Move to Queued
            </div>
          )}
          {book.status !== "completed" && (
            <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("completed")}>
              Move to Completed
            </div>
          )}
          {book.status !== "recommended" && (
            <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("recommended")}>
              Move to Recommendations
            </div>
          )}
          {book.status !== "onHold" && (
            <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("onHold")}>
              Move to On Hold
            </div>
          )}
        </div>
      )}

      {/* Book details dialog */}
      <BookDetailsDialog book={book} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="view" />
    </>
  )
}
