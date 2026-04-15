"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { Book } from "@/types"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export type BookStatus = "reading" | "queued" | "completed" | "recommended" | "onHold"

export function mapTabToStatus(tab: string): BookStatus {
  switch (tab) {
    case "Reading": return "reading"
    case "Queued": return "queued"
    case "Completed": return "completed"
    case "My recommendation": return "recommended"
    case "On Hold": return "onHold"
    default: return "queued"
  }
}

type BookContextType = {
  books: Record<BookStatus, Book[]>
  addBook: (book: any, status: BookStatus) => void
  removeBook: (id: string) => void
  getBooksByStatus: (status: BookStatus) => Book[]
  getBookCountByStatus: (status: BookStatus) => number
  loading: boolean
}

const emptyBooks: Record<BookStatus, Book[]> = {
  reading: [], queued: [], completed: [], recommended: [], onHold: [],
}

const BookContext = createContext<BookContextType | undefined>(undefined)

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Record<BookStatus, Book[]>>(emptyBooks)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Get current user
  useEffect(() => {
    const supabase = createClientSupabaseClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  // Load books from Supabase when userId is available
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const supabase = createClientSupabaseClient()

    async function loadBooks() {
      setLoading(true)
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", userId)

      if (error) {
        console.error("Error loading books:", error)
        setLoading(false)
        return
      }

      const grouped: Record<BookStatus, Book[]> = {
        reading: [], queued: [], completed: [], recommended: [], onHold: [],
      }

      for (const row of data) {
        const status = row.status as BookStatus
        if (grouped[status]) {
          grouped[status].push({
            id: row.id,
            title: row.title,
            author: row.author,
            cover: row.cover_url ?? "",
            status: row.status,
            description: row.description ?? undefined,
            publishedYear: row.published_year ?? undefined,
            rowId: row.row_id ?? undefined,
            selfRating: row.self_rating ?? undefined,
            ...(row.auto_completed ? { autoCompleted: true } : {}),
          } as Book)
        }
      }

      setBooks(grouped)
      setLoading(false)
    }

    loadBooks()
  }, [userId])

  const addBook = useCallback(async (book: any, status: BookStatus) => {
    if (!userId) return
    const supabase = createClientSupabaseClient()
    const bookId = book.id || Math.random().toString(36).substring(2, 9)
    console.log('addBook called', bookId, status, userId)

    const makeRow = (s: BookStatus, auto = false) => ({
      id: bookId,
      user_id: userId,
      title: book.title,
      author: book.author,
      cover_url: book.cover || "",
      status: s,
      description: book.description ?? null,
      published_year: book.publishedYear ?? null,
      auto_completed: auto,
    })

    // Find existing status in local state
    let existingStatus: BookStatus | null = null
    for (const s of Object.keys(books) as BookStatus[]) {
      if (books[s].find((b) => b.id === bookId)) {
        existingStatus = s
        break
      }
    }

    if (existingStatus === status) return

    if (existingStatus) {
      if (existingStatus === "completed" && status === "recommended") {
        // Keep in completed, insert new row for recommended
        const { error } = await supabase.from("books").insert(makeRow("recommended"))
        if (error) { console.error("Error adding to recommended:", error); return }
        setBooks((prev) => ({
          ...prev,
          recommended: [...prev.recommended, { ...book, id: bookId, status: "recommended" }],
        }))
        return
      }

      if (existingStatus === "recommended") {
        // Delete recommended row, delete auto-completed row, insert new status row
        await supabase.from("books")
          .delete()
          .eq("user_id", userId)
          .eq("id", bookId)
          .eq("status", "recommended")

        const autoCompletedBook = books.completed.find((b) => b.id === bookId && (b as any).autoCompleted)
        if (autoCompletedBook) {
          await supabase.from("books")
            .delete()
            .eq("user_id", userId)
            .eq("id", bookId)
            .eq("status", "completed")
            .eq("auto_completed", true)
        }

        await supabase.from("books").insert(makeRow(status))
        setBooks((prev) => {
          const updated = { ...prev }
          updated.recommended = updated.recommended.filter((b) => b.id !== bookId)
          updated.completed = updated.completed.filter((b) => !(b.id === bookId && (b as any).autoCompleted))
          updated[status] = [...updated[status], { ...book, id: bookId, status }]
          return updated
        })
        return
      }

      // Normal move: delete old row, insert new row
      await supabase.from("books")
        .delete()
        .eq("user_id", userId)
        .eq("id", bookId)
        .eq("status", existingStatus)

      await supabase.from("books").insert(makeRow(status))
      setBooks((prev) => {
        const updated = { ...prev }
        updated[existingStatus!] = updated[existingStatus!].filter((b) => b.id !== bookId)
        updated[status] = [...updated[status], { ...book, id: bookId, status }]
        return updated
      })

    } else {
      // New book — insert
      const { error } = await supabase.from("books").insert(makeRow(status))
      if (error) { console.error("Error inserting book:", error); console.log('insert error:', error); return }

      setBooks((prev) => ({
        ...prev,
        [status]: [...prev[status], { ...book, id: bookId, status }],
      }))

      // If added to recommended, also auto-add to completed
      if (status === "recommended") {
        const { error: err2 } = await supabase.from("books").insert(makeRow("completed", true))
        if (!err2) {
          setBooks((prev) => ({
            ...prev,
            completed: [...prev.completed, { ...book, id: bookId, status: "completed", autoCompleted: true }],
          }))
        }
      }
    }
  }, [userId, books])

  const removeBook = useCallback(async (id: string) => {
    if (!userId) return
    const supabase = createClientSupabaseClient()
    await supabase.from("books").delete().eq("id", id).eq("user_id", userId)
    setBooks((prev) => {
      const updated = { ...prev }
      for (const s of Object.keys(updated) as BookStatus[]) {
        updated[s] = updated[s].filter((b) => b.id !== id)
      }
      return updated
    })
  }, [userId])

  const getBooksByStatus = (status: BookStatus) => books[status] || []
  const getBookCountByStatus = (status: BookStatus) => books[status]?.length || 0

  return (
    <BookContext.Provider value={{ books, addBook, removeBook, getBooksByStatus, getBookCountByStatus, loading }}>
      {children}
    </BookContext.Provider>
  )
}

export function useBooks() {
  const context = useContext(BookContext)
  if (context === undefined) throw new Error("useBooks must be used within a BookProvider")
  return context
}
