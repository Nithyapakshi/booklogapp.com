"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import type { Book } from "@/types"

export type BookStatus = "reading" | "queued" | "completed" | "recommended" | "onHold"

export function mapTabToStatus(tab: string): BookStatus {
  switch (tab) {
    case "Reading":
      return "reading"
    case "Queued":
      return "queued"
    case "Completed":
      return "completed"
    case "My recommendation":
      return "recommended"
    case "On Hold":
      return "onHold"
    default:
      return "queued"
  }
}

const initialBooks: Record<BookStatus, Book[]> = {
  reading: [],
  queued: [],
  completed: [],
  recommended: [],
  onHold: [],
}

export function useBooks(userId: string | null) {
  const [books, setBooks] = useState<Record<BookStatus, Book[]>>(initialBooks)
  const supabase = createClientSupabaseClient()

  const fetchBooks = async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author, cover_url, status, description, genre, user_id")
      .eq("user_id", userId)

    if (error) {
      console.error("Error fetching books:", error)
      return
    }

    const organizedBooks: Record<BookStatus, Book[]> = {
      reading: [],
      queued: [],
      completed: [],
      recommended: [],
      onHold: [],
    }

    data.forEach((book: any) => {
      const status = book.status as BookStatus
      if (organizedBooks[status]) {
        organizedBooks[status].push(book)
      }
    })

    setBooks(organizedBooks)
  }

  useEffect(() => {
    fetchBooks()
  }, [userId])

  const getBooksByStatus = (status: BookStatus) => {
    return books[status] || []
  }

  const moveBook = async (
    bookId: string,
    fromStatus: BookStatus,
    toStatus: BookStatus
  ) => {
    if (!userId) return

    // Update status in DB
    const { error } = await supabase
      .from("books")
      .update({ status: toStatus })
      .eq("id", bookId)
      .eq("user_id", userId)

    if (error) {
      console.error("Failed to update book status:", error)
      return
    }

    // Log the move in activity_logs
    const { error: logError } = await supabase.from("activity_logs").insert([
      {
        user_id: userId,
        book_id: bookId,
        action_type: "move",
        from_status: fromStatus,
        to_status: toStatus,
      },
    ])

    if (logError) {
      console.error("Failed to log book move activity:", logError)
    }

    // Refresh the book list
    fetchBooks()
  }

  return {
    books,
    getBooksByStatus,
    refetchBooks: fetchBooks,
    moveBook, // ✅ Exposed for use in BookCard or other components
  }
}
