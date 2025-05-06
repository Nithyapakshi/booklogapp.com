"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { Book } from "@/types"
import { useAuth } from "@/components/auth/auth-provider"
import { createClientSupabaseClient } from "@/lib/supabase/client"

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

// Define a simplified sync status type
export interface SyncStatus {
  online: boolean
  syncing: boolean
}

// Define the context type
type BookContextType = {
  books: Record<BookStatus, Book[]>
  addBook: (book: any, status: BookStatus) => Promise<void>
  removeBook: (id: string) => Promise<void>
  getBooksByStatus: (status: BookStatus) => Book[]
  getBookCountByStatus: (status: BookStatus) => number
  syncStatus: SyncStatus
  isLoading: boolean
}

// Create the context
const BookContext = createContext<BookContextType | undefined>(undefined)

// Create a provider component
export function BookProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Record<BookStatus, Book[]>>({
    reading: [],
    queued: [],
    completed: [],
    recommended: [],
    onHold: [],
  })
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ online: navigator.onLine, syncing: false })
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClientSupabaseClient()

  // Track online status
  useEffect(() => {
    const handleOnline = () => setSyncStatus((prev) => ({ ...prev, online: true }))
    const handleOffline = () => setSyncStatus((prev) => ({ ...prev, online: false }))

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Load books when user changes
  useEffect(() => {
    async function loadBooks() {
      if (!user) {
        // If no user, clear books
        setBooks({
          reading: [],
          queued: [],
          completed: [],
          recommended: [],
          onHold: [],
        })
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setSyncStatus((prev) => ({ ...prev, syncing: true }))

      try {
        // Fetch books from Supabase
        const { data, error } = await supabase.from("books").select("*").eq("user_id", user.id)

        if (error) {
          console.error("Error loading books:", error)
          return
        }

        // Organize books by status
        const booksByStatus: Record<BookStatus, Book[]> = {
          reading: [],
          queued: [],
          completed: [],
          recommended: [],
          onHold: [],
        }

        data.forEach((book) => {
          if (book.status in booksByStatus) {
            booksByStatus[book.status as BookStatus].push(book)
          }
        })

        setBooks(booksByStatus)
      } catch (error) {
        console.error("Error loading books:", error)
      } finally {
        setIsLoading(false)
        setSyncStatus((prev) => ({ ...prev, syncing: false }))
      }
    }

    loadBooks()
  }, [user, supabase])

  const addBook = async (book: any, status: BookStatus) => {
    if (!user) return

    try {
      setSyncStatus((prev) => ({ ...prev, syncing: true }))

      // Special case: When adding a book to "recommended" that already exists in "completed"
      // We should duplicate it rather than move it
      const existingCompletedBook = books.completed.find((b) => b.title === book.title && b.author === book.author)

      // Create a new book object with the required fields
      const newBook: Book = {
        // If moving from completed to recommended, generate a new ID
        id: existingCompletedBook && status === "recommended" ? crypto.randomUUID() : book.id || crypto.randomUUID(),
        title: book.title,
        author: book.author,
        cover: book.cover || book.cover_url || "",
        status,
        description: book.description,
      }

      // Save to Supabase
      await supabase.from("books").upsert({
        ...newBook,
        user_id: user.id,
      })

      // Update local state
      setBooks((prev) => {
        const updatedBooks = { ...prev }

        // If we're not doing the special case duplication, remove the book from its previous category
        if (!(existingCompletedBook && status === "recommended")) {
          // Check if the book already exists in any category
          Object.keys(prev).forEach((statusKey) => {
            const currentStatus = statusKey as BookStatus
            const existingBookIndex = prev[currentStatus].findIndex((b) => b.id === newBook.id)

            if (existingBookIndex !== -1) {
              // Remove from old category
              updatedBooks[currentStatus] = [
                ...prev[currentStatus].slice(0, existingBookIndex),
                ...prev[currentStatus].slice(existingBookIndex + 1),
              ]
            }
          })
        }

        // Add to new category
        updatedBooks[status] = [...updatedBooks[status], newBook]
        return updatedBooks
      })
    } catch (error) {
      console.error("Error adding book:", error)
    } finally {
      setSyncStatus((prev) => ({ ...prev, syncing: false }))
    }
  }

  const removeBook = async (id: string) => {
    if (!user) return

    try {
      setSyncStatus((prev) => ({ ...prev, syncing: true }))

      // Delete from Supabase
      await supabase.from("books").delete().eq("id", id)

      // Update local state
      setBooks((prev) => {
        const newBooks = { ...prev }

        // Remove from all categories
        Object.keys(newBooks).forEach((status) => {
          const statusKey = status as BookStatus
          newBooks[statusKey] = newBooks[statusKey].filter((book) => book.id !== id)
        })

        return newBooks
      })
    } catch (error) {
      console.error("Error removing book:", error)
    } finally {
      setSyncStatus((prev) => ({ ...prev, syncing: false }))
    }
  }

  // Modified to only show books with the requested status
  const getBooksByStatus = (status: BookStatus) => {
    // Return only books with the exact requested status
    return books[status] || []
  }

  // Modified to count only books with the exact requested status
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
        syncStatus,
        isLoading,
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
