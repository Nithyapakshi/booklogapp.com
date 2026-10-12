"use client"

import { nearDuplicate } from "@/lib/book-identity"
import Link from "next/link"
import { BookEditForm } from "@/components/book-edit-form"
import type { Book } from "@/types"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useBooks } from "@/lib/book-context"
import { useToast } from "@/hooks/use-toast"
import { useAmazonUrl } from "@/hooks/use-amazon-url"

interface BookDetailsDialogProps {
  book: {
    id: string
    title: string
    author: string
    genre?: string
    publishedYear?: string | number
    description?: string
    cover?: string
    notes?: string
    status?: string
  } | null
  open: boolean
  onClose: () => void
  mode?: "view" | "add"
  initialEdit?: boolean
}

type BookStatus = "reading" | "queued" | "completed" | "recommended" | "onHold"

const statusLabels = {
  reading: "Currently Reading",
  queued: "Want to Read",
  completed: "Completed",
  recommended: "My Recommendation",
  onHold: "On Hold",
}

export function BookDetailsDialog({ book, open, onClose, mode = "view", initialEdit = false }: BookDetailsDialogProps) {
  const [status, setStatus] = useState<BookStatus>("reading")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const { createBook, updateNote, books } = useBooks()
  const ownedBook = Object.values(books).flat().find(b => b.id === book?.id)
  const [editing, setEditing] = useState(initialEdit)
  const [duplicate, setDuplicate] = useState<Book | null>(null)
  const [near, setNear] = useState<Book | null>(null)
  useEffect(() => { setEditing(initialEdit); setDuplicate(null); setWriteError(null) }, [open, book?.id, initialEdit])
  const { toast } = useToast()
  const amazonUrl = useAmazonUrl(book?.title ?? "", book?.author ?? "")
  const [noteText, setNoteText] = useState(book?.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNoteText(book?.notes ?? "")
  }, [book?.notes])

  const handleAddBook = async (confirmed = false) => {
    if (!book || saving) return
    if (!confirmed) {
      const similar = nearDuplicate(book, Object.values(books).flat())
      if (similar) { setNear(similar); return }
    }
    setNear(null)
    setSaving(true); setWriteError(null)
    try {
      const result = await createBook(book, status)
      if (result.outcome === "duplicate") { setDuplicate(result.books[0]); toast({ title: "Already in your library", type: "warning" }) }
      else { toast({ title: `Added to ${statusLabels[status]}`, type: "success" }); onClose() }
    } catch { setWriteError("The book was not saved. Please try again.") }
    finally { setSaving(false) }
  }

  // Don't render anything if dialog is not open
  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        {writeError && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{writeError}</p>}
        {near && <p role="alert">This looks like a book you already have: {near.title} by {near.author}. <button type="button" className="underline" onClick={() => handleAddBook(true)}>Add anyway</button> <a className="underline" href={`/books?book=${encodeURIComponent(near.id)}`} onClick={onClose}>View existing book</a></p>}
        {duplicate && <p role="alert">Already in your library: {duplicate.title} ({duplicate.status}). <a className="underline" href={`/books?book=${encodeURIComponent(duplicate.id)}`} onClick={onClose}>View existing book</a></p>}
        <DialogHeader>
          <DialogTitle>{book?.title || ""}</DialogTitle>
          <DialogDescription>
            {book?.author || ""} {book?.genre ? `- ${book?.genre}` : ""}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && ownedBook && !editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit details</Button>}
        {editing && ownedBook ? <BookEditForm key={ownedBook.id} book={ownedBook} onDone={() => {setEditing(false); onClose()}} /> : <div className="flex flex-col md:flex-row gap-6">
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
                  target.style.backgroundColor = "var(--bl-e5e7eb)" // Light gray background
                  target.style.display = "flex"
                  target.style.alignItems = "center"
                  target.style.justifyContent = "center"
                  target.style.height = "250px"
                  target.style.color = "var(--bl-6b7280)"
                  target.style.fontSize = "14px"
                  target.style.fontWeight = "500"
                  target.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" // Transparent 1x1 gif
                  target.alt = "No Cover Available"
                }}
              />
            ) : (
              // If no cover URL, show a placeholder div
              <div className="w-full h-[250px] bg-muted rounded-md shadow-md flex items-center justify-center text-muted-foreground text-sm font-medium">
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
                    <p className={showFullDescription ? "text-sm text-muted-foreground leading-relaxed" : "text-sm text-muted-foreground leading-relaxed line-clamp-3"}>{book.description}</p>
                    {book.description && book.description.length > 200 && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-primary text-xs mt-1 hover:underline"
                      >
                        {showFullDescription ? "Show less" : "Show more"}
                      </button>
                    )}
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
                    className="w-full px-3 py-2 border rounded-md bg-card"
                  >
                    <option value="reading">Currently Reading</option>
                    <option value="queued">Want to Read</option>
                    <option value="completed">Completed</option>
                    <option value="recommended">My Recommendation</option>
                    <option value="onHold">On Hold</option>
                  </select>
                </div>

                <Button onClick={() => handleAddBook()} className="w-full">
                  Add to Collection
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <p className="px-3 py-2 border rounded-md bg-muted">{book?.title || ""}</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Author</label>
                  <p className="px-3 py-2 border rounded-md bg-muted">{book?.author || ""}</p>
                </div>
                {book?.publishedYear && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Published Year</label>
                    <p className="px-3 py-2 border rounded-md bg-muted">{book?.publishedYear}</p>
                  </div>
                )}
                {book?.description && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <p className={showFullDescription ? "" : "line-clamp-3"}>{book.description}</p>
                      {book.description && book.description.length > 200 && (
                        <button
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          className="text-primary text-xs mt-1 hover:underline"
                        >
                          {showFullDescription ? "Show less" : "Show more"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea placeholder="Add your personal notes..." value={noteText} onChange={e => setNoteText(e.target.value)} className="w-full px-3 py-2 border rounded-md bg-card text-sm resize-none h-24" />
                  <p className="text-xs text-muted-foreground">Only you can see these notes.</p>
                  <Button size="sm" onClick={async () => {
                    if (!book) return
                    setWriteError(null)
                    try { await updateNote(book.id, noteText); setSaved(true) }
                    catch { setSaved(false); setWriteError("Note was not saved. Please try again.") }
                  }}>Save Note</Button>
                  {saved && <span className="text-xs text-green-600 dark:text-green-300">Saved</span>}
                </div>
                {(book?.status === "queued" || book?.status === "recommended") && (
                  <div style={{ borderTop: "0.5px solid var(--bl-e0d5c4)", paddingTop: "12px", marginTop: "4px" }}>
                    <a
                      href={amazonUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "13px",
                        color: "var(--bl-c17f3e)",
                        fontWeight: 500,
                        textDecoration: "none",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      ↗ Find on Amazon
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>}
      </DialogContent>
    </Dialog>
  )
}
