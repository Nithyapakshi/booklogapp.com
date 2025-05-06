"use client"

import { useState, useRef } from "react"
import type { Book, BookStatus } from "@/types"
import { BookCardDropdown } from "@/components/book-card-dropdown"
import { BookDetailsDialog } from "@/components/book-details-dialog-fix"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface BookTableViewProps {
  books: Book[]
  onBookMoved: () => void
}

const ITEMS_PER_PAGE = 10

export default function BookTableView({ books, onBookMoved }: BookTableViewProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const dropdownRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const supabase = createClientSupabaseClient()
  const totalPages = Math.ceil(books.length / ITEMS_PER_PAGE)
  const paginatedBooks = books.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handleBookClick = (book: Book) => {
    setSelectedBook(book)
    setDialogOpen(true)
  }

  const handleMove = async (book: Book, newStatus: BookStatus) => {
    if (book.status === newStatus) return

    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("title", book.title)
      .eq("author", book.author)
      .eq("status", newStatus)
      .eq("user_id", book.user_id)

    const alreadyExists = existing && existing.length > 0

    if (book.status === "completed" && newStatus === "recommended") {
      if (alreadyExists) {
        toast.error("This book already exists in your collection.")
        setDropdownOpen(null)
        return
      }

      const { error: insertError } = await supabase.from("books").insert({
        id: crypto.randomUUID(),
        title: book.title,
        author: book.author,
        cover_url: book.cover_url || null,
        status: "recommended",
        description: book.description,
        user_id: book.user_id,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        toast.error("Failed to move book.")
        setDropdownOpen(null)
        return
      }

    } else {
      if (alreadyExists) {
        toast.error("This book already exists in your collection.")
        setDropdownOpen(null)
        return
      }

      const { error: updateError } = await supabase
        .from("books")
        .update({ status: newStatus })
        .eq("id", book.id)

      if (updateError) {
        toast.error("Failed to move book.")
        setDropdownOpen(null)
        return
      }
    }

    await supabase.from("activity_logs").insert({
      user_id: book.user_id,
      book_id: book.id,
      action_type: "move",
      from_status: book.status,
      to_status: newStatus,
    })

    setDropdownOpen(null)
    onBookMoved()
  }

  const handleDelete = async (book: Book) => {
    const { error } = await supabase.from("books").delete().eq("id", book.id)

    if (error) {
      toast.error("Failed to delete book.")
      return
    }

    toast.success("Book deleted.")
    onBookMoved()
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Cover</th>
            <th className="p-3">Title</th>
            <th className="p-3">Author</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedBooks.map((book) => (
            <tr key={book.id} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <img
                  src={book.cover_url || "/placeholder.svg"}
                  alt={book.title}
                  width={40}
                  height={60}
                  className="rounded cursor-pointer"
                  onClick={() => handleBookClick(book)}
                />
              </td>
              <td className="p-3">{book.title}</td>
              <td className="p-3">{book.author}</td>
              <td className="p-3 relative">
                <button
                  ref={(el) => { dropdownRefs.current[book.id] = el }}
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setDropdownOpen(dropdownOpen === book.id ? null : book.id)}
                >
                  ⋮
                </button>
                <BookCardDropdown
                  book={book}
                  isOpen={dropdownOpen === book.id}
                  onClose={() => setDropdownOpen(null)}
                  onMove={(newStatus) => handleMove(book, newStatus)}
                  onDelete={() => handleDelete(book)}
                  buttonElement={dropdownRefs.current[book.id] || null}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          className="px-3 py-1 border rounded disabled:opacity-30"
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          className="px-3 py-1 border rounded disabled:opacity-30"
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      <BookDetailsDialog
        book={selectedBook}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode="view"
      />
    </div>
  )
}
