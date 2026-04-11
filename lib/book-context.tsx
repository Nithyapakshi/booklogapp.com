"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
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
  reading: [
    {
      id: "welcome-to-hyunam",
      title: "Welcome to the Hyunam-dong Bookshop",
      author: "Hwang Bo-reum",
      cover: "https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg",
      status: "reading",
      description:
        "A heartwarming story about a small bookshop in Seoul that becomes a sanctuary for people seeking solace and connection.",
      publishedYear: 2023,
    },
  ],
  queued: [],
  completed: [
    {
      id: "great-gatsby",
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      cover: "https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg",
      status: "completed",
      publishedYear: 1925,
    },
    {
      id: "1984",
      title: "1984",
      author: "George Orwell",
      cover: "https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg",
      status: "completed",
      publishedYear: 1949,
    },
  ],
  recommended: [
    {
      id: "to-kill-mockingbird",
      title: "To Kill a Mockingbird",
      author: "Harper Lee",
      cover: "https://m.media-amazon.com/images/I/71FxgtFKcQL._AC_UF1000,1000_QL80_.jpg",
      status: "recommended",
      publishedYear: 1960,
    },
    {
      id: "pride-prejudice",
      title: "Pride and Prejudice",
      author: "Jane Austen",
      cover: "https://m.media-amazon.com/images/I/71Q1tPupKjL._AC_UF1000,1000_QL80_.jpg",
      status: "recommended",
      publishedYear: 1813,
    },
  ],
  onHold: [],
}

// Define the context type
type BookContextType = {
  books: Record<BookStatus, Book[]>
  addBook: (book: any, status: BookStatus) => void
  removeBook: (id: string) => void
  getBooksByStatus: (status: BookStatus) => Book[]
  getBookCountByStatus: (status: BookStatus) => number
}

// Create the context
const BookContext = createContext<BookContextType | undefined>(undefined)

// Create a provider component
export function BookProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with books from localStorage if available
  const [books, setBooks] = useState<Record<BookStatus, Book[]>>(() => {
    if (typeof window !== "undefined") {
      const savedBooks = localStorage.getItem("booklog-books")
      return savedBooks ? JSON.parse(savedBooks) : initialBooks
    }
    return initialBooks
  })

  // Save books to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("booklog-books", JSON.stringify(books))
    }
  }, [books])

  const addBook = (book: any, status: BookStatus) => {
    const bookId = book.id || Math.random().toString(36).substring(2, 9)

    setBooks((prev) => {
      // Find if book exists anywhere and where
      let existingStatus: BookStatus | null = null
      for (const s of Object.keys(prev) as BookStatus[]) {
        if (prev[s].find((b) => b.id === bookId)) {
          existingStatus = s
          break
        }
      }

      const makeBook = (s: BookStatus, auto = false): Book => ({
        id: bookId,
        title: book.title,
        author: book.author,
        cover: book.cover || "",
        status: s,
        description: book.description,
        publishedYear: book.publishedYear,
        ...(auto ? { autoCompleted: true } : {}),
      } as Book)

      const updated = { ...prev }

      // Already in the target status — do nothing
      if (existingStatus === status) return prev

      if (existingStatus) {
        // Book exists somewhere — handle move

        if (existingStatus === "completed" && status === "recommended") {
          // Completed -> Recommended: keep copy in Completed, add to Recommended
          updated["recommended"] = [...updated["recommended"], makeBook("recommended")]
          return updated
        }

        if (existingStatus === "recommended") {
          // Leaving Recommended: remove from Recommended
          updated["recommended"] = updated["recommended"].filter((b) => b.id !== bookId)
          // Also remove auto-created Completed copy
          updated["completed"] = updated["completed"].filter(
            (b) => !(b.id === bookId && (b as any).autoCompleted)
          )
          // Add to new status
          updated[status] = [...updated[status], makeBook(status)]
          return updated
        }

        // Normal move: remove from old, add to new
        updated[existingStatus] = updated[existingStatus].filter((b) => b.id !== bookId)
        updated[status] = [...updated[status], makeBook(status)]
        return updated

      } else {
        // New book — add to target status
        updated[status] = [...updated[status], makeBook(status)]

        // If added directly to Recommended, also auto-add to Completed
        if (status === "recommended") {
          updated["completed"] = [...updated["completed"], makeBook("completed", true)]
        }

        return updated
      }
    })
  }

  const removeBook = (id: string) => {
    setBooks((prev) => {
      const newBooks = { ...prev }

      // Find and remove the book from the appropriate status array
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

  return (
    <BookContext.Provider
      value={{
        books,
        addBook,
        removeBook,
        getBooksByStatus,
        getBookCountByStatus,
      }}
    >
      {children}
    </BookContext.Provider>
  )
}

// Create a hook to use the book context
export function useBooks() {
  const context = useContext(BookContext)
  if (context === undefined) {
    throw new Error("useBooks must be used within a BookProvider")
  }
  return context
}
