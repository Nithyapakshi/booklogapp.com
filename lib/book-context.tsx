"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
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

interface BookContextType {
  books: Record<BookStatus, Book[]>
  addBook: (book: Book, status: BookStatus) => void
  removeBook: (id: string) => void
  moveBook: (id: string, fromStatus: BookStatus, toStatus: BookStatus) => void
  getBooksByStatus: (status: BookStatus) => Book[]
  getBookCountByStatus: (status: BookStatus) => number
  loading: boolean
  reloadBooks: () => Promise<void>
}

const BookContext = createContext<BookContextType | undefined>(undefined)

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Record<BookStatus, Book[]>>({
    reading: [],
    queued: [],
    completed: [],
    recommended: [],
    onHold: [],
  })

  const [loading, setLoading] = useState(false)

  const addBook = (book: Book, status: BookStatus) => {
    setBooks((prev) => {
      const newBooks = { ...prev }
      newBooks[status] = [...newBooks[status], book]
      return newBooks
    })
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

  const moveBook = (id: string, fromStatus: BookStatus, toStatus: BookStatus) => {
    setBooks((prev) => {
      const newBooks = { ...prev }
      const bookToMove = newBooks[fromStatus].find((book) => book.id === id)
      if (bookToMove) {
        newBooks[fromStatus] = newBooks[fromStatus].filter((book) => book.id !== id)
        newBooks[toStatus] = [...newBooks[toStatus], bookToMove]
      }
      return newBooks
    })
  }

  const getBooksByStatus = (status: BookStatus) => {
    return books[status] || []
  }

  const getBookCountByStatus = (status: BookStatus) => {
    return books[status]?.length || 0
  }

  const reloadBooks = async () => {
    setLoading(true)
    try {
      // Simulate loading books from a database or API
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } finally {
      setLoading(false)
    }
  }

  const value: BookContextType = {
    books,
    addBook,
    removeBook,
    moveBook,
    getBooksByStatus,
    getBookCountByStatus,
    loading,
    reloadBooks,
  }

  return (
    <BookContext.Provider value={value}>
      {children}
    </BookContext.Provider>
  )
}

export const useBooks = () => {
  const context = useContext(BookContext)
  if (context === undefined) {
    throw new Error("useBooks must be used within a BookProvider")
  }
  return context
}
