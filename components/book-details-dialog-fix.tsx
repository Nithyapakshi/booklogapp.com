"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, ChevronDown, Sparkles } from "lucide-react"
import type { Book, BookSearchResult } from "@/types"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { getBookSummary } from "@/app/actions/book-summary"

interface BookDetailsDialogProps {
  book: Book | BookSearchResult | null
  open: boolean
  onClose: () => void
  onBookAdded?: () => void
  mode?: "add" | "view" | "edit"
}

export function BookDetailsDialog({ book, open, onClose, onBookAdded, mode = "add" }: BookDetailsDialogProps) {
  console.log("Incoming book to dialog:", book)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>("Currently Reading")
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [showOriginalDescription, setShowOriginalDescription] = useState(false)

  const statusOptions = ["Currently Reading", "Want to Read", "Completed", "On Hold", "Recommend"]

  const sanitizeDescription = (html: string | undefined): string => {
    if (!html) return "No description available."
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = html
    return tempDiv.textContent || tempDiv.innerText || "No description available."
  }

  useEffect(() => {
    if (open && book) {
      if (mode === "view") {
        checkCachedSummary()
      } else if (book.description && book.description.length > 100) {
        generateSummary()
      } else {
        setSummary(sanitizeDescription(book.description))
      }
    }
  }, [open, book, mode])

  const checkCachedSummary = async () => {
    if (!book) return
    setIsLoadingSummary(true)
    try {
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase.from("books").select("ai_summary").eq("id", book.id).single()
      if (!error && data?.ai_summary) {
        setSummary(data.ai_summary as string)
      } else {
        setSummary(sanitizeDescription(book.description))
      }
    } catch (err) {
      console.error("Error checking summary:", err)
      setSummary(sanitizeDescription(book.description))
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const generateSummary = async () => {
    if (!book || !book.description) return
    setIsLoadingSummary(true)
    try {
      const tempId = book.id || `temp-${Date.now()}`
      const cleanDescription = sanitizeDescription(book.description)
      const aiSummary = await getBookSummary(tempId, book.title, book.author, cleanDescription)
      setSummary(aiSummary || cleanDescription)
    } catch (err) {
      console.error("Error generating summary:", err)
      setSummary(sanitizeDescription(book.description))
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const handleAddToCollection = async () => {
    if (!book) return
    setIsAdding(true)
    setError(null)
    setSuccess(null)

    const dbStatus =
      selectedStatus === "Currently Reading" ? "reading" :
      selectedStatus === "Want to Read" ? "queued" :
      selectedStatus === "Completed" ? "completed" :
      selectedStatus === "On Hold" ? "onHold" :
      selectedStatus === "Recommend" ? "recommended" : "reading"

    try {
      const supabase = createClientSupabaseClient()
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) throw new Error("Authentication failed. Please log in again.")

      const currentUserId = userData.user.id

      // Check for existing duplicate
      const { data: existingBooks, error: fetchError } = await supabase
        .from("books")
        .select("id, status")
        .eq("user_id", currentUserId)
        .eq("title", book.title)
        .eq("author", book.author)

      if (fetchError) throw new Error("Could not check for duplicates")

      const alreadyExists = existingBooks.length > 0
      const isDuplicateAllowed = dbStatus === "recommended" && existingBooks.some(b => b.status === "completed")

      if (alreadyExists && !isDuplicateAllowed) {
        setError("This book already exists in your collection.")
        setIsAdding(false)
        return
      }

      const bookId = crypto.randomUUID()

      const { error: insertError } = await supabase.from("books").insert({
        id: bookId,
        title: book.title,
        author: book.author,
       genre: (book as any).genre || null, 
        cover_url: (book as any).cover_url || (book as any).cover || "",
        status: dbStatus,
        description: sanitizeDescription(book.description),
        ai_summary: summary,
        user_id: currentUserId,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        throw new Error(`Failed to add book: ${insertError.message}`)
      }

      setSuccess("Book added successfully!")
      if (onBookAdded) onBookAdded()

      localStorage.setItem(
        "booklog-active-tab",
        dbStatus === "onHold" ? "On Hold" :
        dbStatus === "recommended" ? "My recommendation" :
        dbStatus.charAt(0).toUpperCase() + dbStatus.slice(1)
      )

      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      console.error("Error adding book:", err)
      setError(err instanceof Error ? err.message : "Failed to add book. Please try again.")
    } finally {
      setIsAdding(false)
    }
  }

  if (!open || !book) return null

  const sanitizedDescription = sanitizeDescription(book.description)

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-visible max-h-[90vh]">
        <DialogTitle className="sr-only">{book.title} Details</DialogTitle>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-10"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="p-6">
          <h2 className="text-2xl font-bold mb-2">{book.title}</h2>
          <p className="text-gray-600 text-lg mb-6">{book.author}</p>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3">
              {(book as any).cover_url || (book as any).cover ? (
                <img
                  src={(book as any).cover_url || (book as any).cover}
                  alt={book.title}
                  className="w-full h-auto object-cover rounded-md shadow-md"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-gray-200 flex items-center justify-center rounded-md shadow-md">
                  <span className="text-2xl font-bold text-gray-800">
                    {book.title.charAt(0)}
                    {book.author.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full md:w-2/3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold">Description</h3>
                {summary && summary !== sanitizedDescription && (
                  <button
                    onClick={() => setShowOriginalDescription(!showOriginalDescription)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showOriginalDescription ? "Show AI Summary" : "Show Original"}
                  </button>
                )}
              </div>

              <div className="h-[300px] overflow-y-auto border border-gray-200 rounded-md p-3 mb-6">
                {isLoadingSummary ? (
                  <div className="flex items-center space-x-2 my-4">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    <span className="text-gray-600">Generating AI summary...</span>
                  </div>
                ) : (
                  <>
                    {!showOriginalDescription && summary && (
                      <div>
                        {summary !== sanitizedDescription && (
                          <div className="flex items-center gap-1 mb-2 text-xs text-blue-600">
                            <Sparkles className="h-3 w-3" />
                            <span>AI-generated summary</span>
                          </div>
                        )}
                        <p className="text-gray-700 whitespace-pre-line">{summary}</p>
                      </div>
                    )}
                    {showOriginalDescription && (
                      <p className="text-gray-700 whitespace-pre-line">{sanitizedDescription}</p>
                    )}
                  </>
                )}
              </div>

              {mode === "add" && (
                <>
                  <h3 className="text-lg font-medium mb-3">Add to your collection</h3>

                  <div className="relative mb-4">
                    <div
                      className="w-full border rounded-md p-3 flex justify-between items-center cursor-pointer"
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    >
                      <span>{selectedStatus}</span>
                      <ChevronDown className="h-5 w-5" />
                    </div>

                    {showStatusDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {statusOptions.map((status) => (
                          <div
                            key={status}
                            className="py-2 px-3 hover:bg-gray-100 cursor-pointer"
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
                  {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md mb-3 flex justify-between items-center">
                      <p>{success}</p>
                      <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">
                        ×
                      </button>
                    </div>
                  )}

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
