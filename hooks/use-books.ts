"use client"

import { useState } from "react"
import type { Book } from "@/types"

export type BookStatus = "reading" | "queued" | "completed" | "recommended" | "onHold"

// Map tab names to status values
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

// Initial books for demonstration
const initialBooks: Record<BookStatus, Book[]> = {
  reading: [],
  queued: [],
  completed: [],
  recommended: [],
  onHold: [],
}

export function useBooks() {
  const [books, setBooks] = useState<Record<BookStatus, Book[]>>(initialBooks)

  const addBook = (book: any, status: BookStatus) => {
    setBooks((prev) => ({
      ...prev,
      [status]: [...prev[status], book],
    }))
  }

  const removeBook = (id: string) => {
    setBooks((prev) => {
      const newBooks = { ...prev }
      Object.keys(newBooks).forEach((status) => {
        const statusKey = status as BookStatus
        newBooks[statusKey] = newBooks[statusKey].filter((book) => book.id !== id)
      })
      return newBooks
    })
  }

  const getBooksByStatus = (status: BookStatus) => {
    return books[status] || []
  }

  const getBookCountByStatus = (status: BookStatus) => {
    return books[status]?.length || 0
  }

  return {
    books,
    addBook,
    removeBook,
    getBooksByStatus,
    getBookCountByStatus,
  }
}
