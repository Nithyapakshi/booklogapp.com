"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useBooks } from "@/lib/book-context"

interface BookDetailsDialogProps {
  book: {
    id: string
    title: string
    author: string
    genre?: string
    publishedYear?: string | number
    description?: string
    cover?: string
  } | null
  open: boolean
  onClose: () => void
  mode?: "view" | "add"
}

type BookStatus = "reading" | "queued" | "completed" | "recommended" | "onHold"

const statusLabels = {
  reading: "Currently Reading",
  queued: "Want to Read",
  completed: "Completed",
  recommended: "My Recommendation",
  onHold: "On Hold",
}

export function BookDetailsDialog({ book, open, onClose, mode = "view" }: BookDetailsDialogProps) {
  const [status, setStatus] = useState<BookStatus>("reading")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { addBook } = useBooks()

  const handleAddBook = () => {
    if (book) {
      addBook(book, status)
      onClose()
    }
  }

  // Don't render anything if dialog is not open
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{book?.title || ""}</DialogTitle>
          <DialogDescription>
            {book?.author || ""} {book?.genre ? `- ${book?.genre}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Book cover image */}
          <div className="w-full md:w-1/3 max-w-[180px] mx-auto md:mx-0">
            {book?.cover ? (
              <img
                src={book.cover || "/placeholder.svg"}
                alt={book?.title || "Book cover"}
                className="w-full h-auto object-cover rounded-md shadow-md"
                onError={(e) => {
                  // If image fails, replace with a colored div
                  const target = e.currentTarget
                  target.onerror = null // Prevent infinite loop
                  target.style.backgroundColor = "#e5e7eb" // Light gray background
                  target.style.display = "flex"
                  target.style.alignItems = "center"
                  target.style.justifyContent = "center"
                  target.style.height = "250px"
                  target.style.color = "#6b7280"
                  target.style.fontSize = "14px"
                  target.style.fontWeight = "500"
                  target.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" // Transparent 1x1 gif
                  target.alt = "No Cover Available"
                }}
              />
            ) : (
              // If no cover URL, show a placeholder div
              <div className="w-full h-[250px] bg-gray-200 rounded-md shadow-md flex items-center justify-center text-gray-500 text-sm font-medium">
                No Cover Available
              </div>
            )}
          </div>

          {/* Book details */}
          <div className="w-full md:w-2/3">
            {mode === "add" ? (
              <div className="space-y-4">
                {/* Add book description */}
                {book?.description && (
                  <div className="mb-4">
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-sm text-gray-700">{book.description}</p>
                  </div>
                )}

                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="status" className="text-sm font-medium">
                    Add to your collection
                  </label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BookStatus)}
                    className="w-full px-3 py-2 border rounded-md bg-white"
                  >
                    <option value="reading">Currently Reading</option>
                    <option value="queued">Want to Read</option>
                    <option value="completed">Completed</option>
                    <option value="recommended">My Recommendation</option>
                    <option value="onHold">On Hold</option>
                  </select>
                </div>

                <Button onClick={handleAddBook} className="w-full">
                  Add to Collection
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <p className="px-3 py-2 border rounded-md bg-gray-50">{book?.title || ""}</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Author</label>
                  <p className="px-3 py-2 border rounded-md bg-gray-50">{book?.author || ""}</p>
                </div>
                {book?.publishedYear && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Published Year</label>
                    <p className="px-3 py-2 border rounded-md bg-gray-50">{book?.publishedYear}</p>
                  </div>
                )}
                {book?.description && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <div className="p-3 border rounded-md text-sm text-gray-700 max-h-40 overflow-y-auto">
                      {book.description}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
