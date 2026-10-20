"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { validateBookDetails } from "@/lib/book-identity"
import { lookupEnrichment, isUnknownAuthor, UNKNOWN_AUTHOR } from "@/lib/book-enrichment"
import type { Book } from "@/types"
import { createClientSupabaseClient } from "@/lib/supabase/client"

import { RecommendationRatingDialog } from "@/components/recommendation-rating-dialog"
import { FinishBookDialog } from "@/components/finish-book-dialog"
import { StartBookDialog } from "@/components/start-book-dialog"
import { isValidDate, toPrecision, type DatePrecision } from "@/lib/reading-dates"

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

export type BookSaveResult = { outcome: "added" | "edited" | "duplicate"; books: Book[] }

type BookContextType = {
  createBook: (book: any, status: BookStatus, opts?: { skipStartPrompt?: boolean }) => Promise<BookSaveResult>
  editBook: (id: string, details: {title: string; author: string; cover?: string}) => Promise<BookSaveResult>
  saveDates: (bookId: string, dates: { startedAt?: string | null; startedPrecision?: DatePrecision; finishedAt?: string | null; finishedPrecision?: DatePrecision }) => Promise<void>
  moveBook: (book: any, status: BookStatus) => Promise<"added" | "duplicate" | "moved">
  books: Record<BookStatus, Book[]>
  addBook: (book: any, status: BookStatus) => Promise<'added' | 'duplicate' | 'moved'>
  removeBook: (id: string, status: BookStatus, rowId?: string) => Promise<void>
  getBooksByStatus: (status: BookStatus) => Book[]
  getBookCountByStatus: (status: BookStatus) => number
  loading: boolean
  loadError: boolean
  reloadBooks: () => void
  updateNote: (bookId: string, note: string) => Promise<void>
  updateRating: (bookId: string, rating: number) => Promise<void>
}

const emptyBooks: Record<BookStatus, Book[]> = {
  reading: [], queued: [], completed: [], recommended: [], onHold: [],
}

const BookContext = createContext<BookContextType | undefined>(undefined)
const healedUsers = new Set<string>() // auto-heal runs once per page load per user

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Record<BookStatus, Book[]>>(emptyBooks)
  const { user, isLoading: authLoading } = useAuth()
  const userId = user?.id ?? null
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)
  const reloadBooks = useCallback(() => setReloadTick(t => t + 1), [])
  const [ratingPrompt, setRatingPrompt] = useState<{ id: string; title: string; rating: number } | null>(null)
  const [finishPrompt, setFinishPrompt] = useState<{ id: string; title: string; rating: number; finishedAt?: string; where: "Completed" | "Recommendations"; direct?: boolean } | null>(null)
  const [startPrompt, setStartPrompt] = useState<{ id: string; title: string; startedAt?: string } | null>(null)

  // Load books from Supabase when userId is available
  useEffect(() => {
    if (authLoading) { setLoading(true); return }
    if (!userId) {
      setBooks(emptyBooks)
      setRatingPrompt(null)
      setFinishPrompt(null)
      setStartPrompt(null)
      setLoading(false)
      return
    }

    const supabase = createClientSupabaseClient()

    async function loadBooks() {
      setLoading(true)
      setLoadError(false)
      try {
        const { data, error } = await supabase
          .from("books")
          .select("*")
          .eq("user_id", userId)

        const { data: noteRows, error: notesError } = await supabase.from("book_notes").select("book_id,notes").eq("user_id", userId!)

        // A failed read must never look like an empty library: keep what is on screen and say so.
        if (error || notesError || !data) {
          console.error("Error loading books:", error || notesError)
          setLoadError(true)
          setLoading(false)
          return
        }
        const notesByBook = new Map((noteRows || []).map(row => [row.book_id, row.notes]))

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
              notes: notesByBook.get(row.id) ?? undefined,
              genre: row.genre ?? undefined,
              startedAt: isValidDate(row.started_at) ? row.started_at : undefined,
              finishedAt: isValidDate(row.finished_at) ? row.finished_at : undefined,
              startedPrecision: toPrecision(row.started_precision),
              finishedPrecision: toPrecision(row.finished_precision),
              ...(row.auto_completed ? { autoCompleted: true } : {}),
            } as Book)
          }
        }

        setBooks(grouped)
      } catch (error) {
        console.error("Error loading books:", error)
        setLoadError(true)
      }
      setLoading(false)
    }

    loadBooks()
  }, [userId, authLoading, reloadTick])

  const addBook = useCallback(async (book: any, status: BookStatus) => {
    if (!userId || loading || authLoading) throw new Error("Wait for your library to finish loading")
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
      self_rating: book.selfRating ?? null,
      genre: book.genre ?? null,
    })

    // Find existing status in local state
    let existingStatus: BookStatus | null = null
    let existingBook: Book | undefined
    const normalise = (s: string) => s.trim().toLowerCase()
    const sourceOrder = (Object.keys(books) as BookStatus[]).sort((a, b) => Number(b === book.status) - Number(a === book.status))
    for (const s of sourceOrder) {
      const match = books[s].find((b) =>
        b.id === bookId ||
        (normalise(b.title) === normalise(book.title) && normalise(b.author) === normalise(book.author))
      )
      if (match) {
        existingBook = match
        existingStatus = s
        break
      }
    }

    if (books[status].some(b => b.id === bookId || (normalise(b.title) === normalise(book.title) && normalise(b.author) === normalise(book.author)))) return 'duplicate' 

    if (existingStatus) {
      // The Completed copy made by recommending a book moves with it, so going back to Reading really leaves Recommendations.
      if (existingStatus === "recommended" || status === "recommended" || (status === "reading" && existingBook!.autoCompleted)) {
        const { data, error } = await supabase.rpc("book_membership", { p_book_id: existingBook!.id, p_status: status, p_remove: false })
        if (error) throw error
        if (!data?.length) throw new Error("Book was not moved")
        setBooks(prev => {
          const next = { ...prev }
          for (const key of Object.keys(next) as BookStatus[]) next[key] = next[key].filter(b => b.id !== existingBook!.id)
          for (const row of data) {
            const key = row.status as BookStatus
            next[key] = [...next[key], { ...existingBook!, status: key, rowId: row.row_id, autoCompleted: row.auto_completed, startedAt: isValidDate(row.started_at) ? row.started_at : undefined, finishedAt: isValidDate(row.finished_at) ? row.finished_at : undefined, startedPrecision: toPrecision(row.started_precision), finishedPrecision: toPrecision(row.finished_precision) } as Book]
          }
          return next
        })
        // Dates are asked only at the two moments they happen: finishing (Reading to Recommended) and starting (into Reading).
        if (status === "recommended" && existingStatus === "reading") setFinishPrompt({ id: existingBook!.id, title: existingBook!.title, rating: existingBook!.selfRating || 0, finishedAt: existingBook!.finishedPrecision === "month" ? undefined : existingBook!.finishedAt, where: "Recommendations" })
        else if (status === "recommended") setRatingPrompt({ id: existingBook!.id, title: existingBook!.title, rating: existingBook!.selfRating || 0 })
        else if (status === "reading") setStartPrompt({ id: existingBook!.id, title: existingBook!.title, startedAt: existingBook!.startedPrecision === "month" ? undefined : existingBook!.startedAt })
        return "moved" as const
      }

      const storedId = existingBook!.id
      const { data, error } = await supabase.from("books")
        .update({ status }).eq("user_id", userId).eq("id", storedId).eq("status", existingStatus)
        .select("id")
      if (error) throw error
      if (!data?.length) throw new Error("Book was not moved. Refresh and try again.")
      setBooks((prev) => ({ ...prev,
        [existingStatus!]: prev[existingStatus!].filter((b) => b.id !== storedId),
        [status]: [...prev[status], { ...existingBook!, status }],
      }))
      // Dates are asked only when they happen, never invented: finishing (Reading to Completed) and starting (into Reading).
      if (status === "completed" && existingStatus === "reading") setFinishPrompt({ id: storedId, title: existingBook!.title, rating: existingBook!.selfRating || 0, finishedAt: existingBook!.finishedPrecision === "month" ? undefined : existingBook!.finishedAt, where: "Completed" })
      else if (status === "completed" && (existingStatus === "queued" || existingStatus === "onHold")) setFinishPrompt({ id: storedId, title: existingBook!.title, rating: existingBook!.selfRating || 0, finishedAt: existingBook!.finishedPrecision === "month" ? undefined : existingBook!.finishedAt, where: "Completed", direct: true })
      else if (status === "reading") setStartPrompt({ id: storedId, title: existingBook!.title, startedAt: existingBook!.startedPrecision === "month" ? undefined : existingBook!.startedAt })
      return "moved" as const

    } else {
      // One INSERT request is atomic, including the deliberate Completed copy.
      const rows = status === "recommended" ? [makeRow(status), makeRow("completed", true)] : [makeRow(status)]
      const { data, error } = await supabase.from("books").insert(rows).select("row_id,status")
      if (error) throw error
      if (data?.length !== rows.length) throw new Error("Book was not saved. Refresh and try again.")
      setBooks((prev) => ({
        ...prev,
        [status]: [...prev[status], { ...book, id: bookId, status, rowId: data.find(r => r.status === status)?.row_id }],
        ...(status === "recommended" ? { completed: [...prev.completed, { ...book, id: bookId, status: "completed", autoCompleted: true, rowId: data.find(r => r.status === "completed")?.row_id }] } : {}),
      }))
      if (status === "recommended") setRatingPrompt({ id: bookId, title: book.title, rating: book.selfRating || 0 })
      else if (status === "reading") setStartPrompt({ id: bookId, title: book.title })
      return "added" as const
    }
  }, [userId, books, loading, authLoading])

  // Best effort, after the book is already saved. Fills only blank fields, only while the title and author are unchanged,
  // and any failure leaves the book exactly as saved.
  const enrichMissing = useCallback(async (saved: Book) => {
    try {
      if (!userId || (saved.cover && saved.description && !isUnknownAuthor(saved.author))) return
      const found = await lookupEnrichment(saved.title, saved.author)
      if (!found) return
      const supabase = createClientSupabaseClient()
      const applied: Partial<Book> = {}
      const fill = async (column: string, key: keyof Book, value: unknown, blank: string) => {
        if (value === undefined || value === null || value === "") return
        const { data } = await supabase.from("books").update({ [column]: value })
          .eq("user_id", userId).eq("id", saved.id).eq("title", saved.title).eq("author", saved.author).or(blank).select("row_id")
        if (data?.length) (applied as any)[key] = value
      }
      if (!saved.cover) await fill("cover_url", "cover", found.cover, "cover_url.is.null,cover_url.eq.")
      if (!saved.description) await fill("description", "description", found.description, "description.is.null,description.eq.")
      if (!saved.genre) await fill("genre", "genre", found.genre, "genre.is.null,genre.eq.")
      if (!saved.publishedYear) await fill("published_year", "publishedYear", found.publishedYear, "published_year.is.null")
      if (isUnknownAuthor(saved.author)) await fill("author", "author", found.author, `author.eq.${UNKNOWN_AUTHOR}`)
      if (Object.keys(applied).length) setBooks(prev => {
        const next = {...prev}
        for (const key of Object.keys(next) as BookStatus[]) next[key] = next[key].map(b => b.id === saved.id && b.title === saved.title && b.author === saved.author ? {...b, ...Object.fromEntries(Object.entries(applied).filter(([k]) => !(b as any)[k]))} : b)
        return next
      })
    } catch (error) {
      console.error("Book detail lookup failed", error)
    }
  }, [userId])

  // Auto-heal on app open: fill blank details on this user's own books that have no cover (or no author).
  // Best effort and fill-only (enrichMissing never overwrites anything typed). At most 12 books per open,
  // and each book is tried at most once every 6 hours so a flaky lookup is not hammered.
  useEffect(() => {
    if (loading || authLoading || !userId || healedUsers.has(userId)) return
    healedUsers.add(userId)
    const now = Date.now()
    const seen = new Set<string>()
    const todo: { book: Book; key: string }[] = []
    for (const list of Object.values(books)) for (const b of list) {
      if ((b.cover && !isUnknownAuthor(b.author)) || seen.has(b.id)) continue
      seen.add(b.id)
      const key = `booklog.heal:${userId}:${b.id}`
      let last = 0
      try { last = Number(localStorage.getItem(key) || 0) } catch {}
      if (now - last < 6 * 60 * 60 * 1000) continue
      todo.push({ book: b, key })
    }
    if (!todo.length) return
    void (async () => {
      for (const { book, key } of todo.slice(0, 12)) {
        try { localStorage.setItem(key, String(Date.now())) } catch {}
        await enrichMissing(book)
      }
    })()
  }, [loading, authLoading, userId, books, enrichMissing])

  const saveDetails = useCallback(async (book: any, status: BookStatus, edit: boolean, opts?: { skipStartPrompt?: boolean }): Promise<BookSaveResult> => {
    if (!userId || loading || authLoading) throw new Error("Wait for your library to finish loading")
    const errorText = validateBookDetails(book.title, book.author || "", book.cover || "")
    if (errorText) throw new Error(errorText)
    const supabase = createClientSupabaseClient()
    const {data, error} = await supabase.rpc("save_book_details", {
      p_id: book.id || crypto.randomUUID(), p_title: book.title.trim(), p_author: (book.author || "").trim() || UNKNOWN_AUTHOR,
      p_cover: book.cover === undefined || book.cover === null ? (edit ? null : "") : String(book.cover).trim(), p_edit: edit, p_status: status,
      p_genre: book.genre ?? null, p_description: book.description ?? null,
      p_year: book.publishedYear ?? null, p_rating: book.selfRating ?? null,
    })
    if (error) throw error
    if (!data || !["added", "edited", "duplicate"].includes(data.outcome) || !data.books?.length) throw new Error("Book was not saved. Refresh and try again.")
    const rows: Book[] = data.books.map((row: any) => {
      const old = Object.values(books).flat().find(b => b.id === row.id)
      return {...old, id: row.id, title: row.title, author: row.author, cover: row.cover_url || "", status: row.status,
        rowId: row.row_id, genre: row.genre, description: row.description, publishedYear: row.published_year,
        selfRating: row.self_rating, autoCompleted: row.auto_completed}
    })
    if (data.outcome !== "duplicate") {
      setBooks(prev => {
        const next = {...prev}
        for (const key of Object.keys(next) as BookStatus[]) next[key] = next[key].filter(b => b.id !== rows[0].id)
        for (const row of rows) {
          const latest = Object.values(prev).flat().find(b => b.id === row.id)
          next[row.status as BookStatus] = [...next[row.status as BookStatus], {...row, notes: latest?.notes ?? row.notes}]
        }
        return next
      })
      if (!edit && status === "recommended") setRatingPrompt({id: rows[0].id, title: rows[0].title, rating: rows[0].selfRating || 0})
      else if (!edit && status === "reading" && !opts?.skipStartPrompt) setStartPrompt({id: rows[0].id, title: rows[0].title})
    }
    if (data.outcome !== "duplicate" && (edit || (!book.cover && !book.description))) void enrichMissing(rows[0])
    return {outcome: data.outcome, books: rows}
  }, [userId, loading, authLoading, books, enrichMissing])
  const createBook = useCallback((book: any, status: BookStatus, opts?: { skipStartPrompt?: boolean }) => saveDetails(book, status, false, opts), [saveDetails])
  const editBook = useCallback((id: string, details: {title: string; author: string; cover?: string}) => saveDetails({...details, id}, "queued", true), [saveDetails])

  const removeBook = useCallback(async (id: string, status: BookStatus, rowId?: string) => {
    if (!userId) return
    const supabase = createClientSupabaseClient()

    if (status === "recommended") {
      const { data, error } = await supabase.rpc("book_membership", { p_book_id: id, p_status: status, p_remove: true })
      if (error) throw error
      setBooks(prev => {
        const next = { ...prev }
        const source = prev.recommended.find(b => b.id === id)
        for (const key of Object.keys(next) as BookStatus[]) next[key] = next[key].filter(b => b.id !== id)
        for (const row of data || []) {
          const key = row.status as BookStatus
          next[key] = [...next[key], { ...source!, status: key, rowId: row.row_id, autoCompleted: row.auto_completed } as Book]
        }
        return next
      })
    } else {
      // For all other statuses, delete all rows with this id
      const { data, error } = await supabase.from("books").delete().eq("id", id).eq("user_id", userId).select("id")
      if (error) throw error
      if (!data?.length) throw new Error("Book was not deleted")
      setBooks((prev) => {
        const updated = { ...prev }
        for (const s of Object.keys(updated) as BookStatus[]) {
          updated[s] = updated[s].filter((b) => b.id !== id)
        }
        return updated
      })
    }
  }, [userId, books])

  const updateNote = useCallback(async (bookId: string, note: string) => {
    if (!userId) return
    const supabase = createClientSupabaseClient()
    const { data, error } = await supabase.from("book_notes").upsert({ user_id: userId, book_id: bookId, notes: note, updated_at: new Date().toISOString() }).select("book_id")
    if (error) throw error
    if (!data?.length) throw new Error("Note was not saved")
    setBooks((prev) => {
      const updated = { ...prev }
      for (const s of Object.keys(updated) as BookStatus[]) {
        updated[s] = updated[s].map((b) => b.id === bookId ? { ...b, notes: note } : b)
      }
      return updated
    })
  }, [userId])

  const updateRating = useCallback(async (bookId: string, rating: number) => {
    if (!userId) return
    const supabase = createClientSupabaseClient()
    // Update all rows for this book (covers both completed and recommended copies)
    const { data, error } = await supabase.from("books").update({ self_rating: rating }).eq("id", bookId).eq("user_id", userId).select("id")
    if (error) throw error
    if (!data?.length) throw new Error("Rating was not saved")
    setBooks((prev) => {
      const updated = { ...prev }
      for (const s of Object.keys(updated) as BookStatus[]) {
        updated[s] = updated[s].map((b) => b.id === bookId ? { ...b, selfRating: rating } : b)
      }
      return updated
    })
  }, [userId])

  const saveFinish = useCallback(async (bookId: string, rating: number, finishedAt: string, where: "Completed" | "Recommendations", precision: DatePrecision = "day") => {
    if (!userId || !isValidDate(finishedAt)) throw new Error("Invalid finish date")
    const supabase = createClientSupabaseClient()
    const patch: Record<string, unknown> = { finished_at: finishedAt, finished_precision: precision }
    if (rating) patch.self_rating = rating
    // Reading to Recommended leaves a Completed copy as well, so both rows get the day. Otherwise only the Completed row does.
    let q = supabase.from("books").update(patch).eq("id", bookId).eq("user_id", userId)
    if (where === "Completed") q = q.eq("status", "completed")
    const { data, error } = await q.select("id")
    if (error) throw error
    if (!data?.length) throw new Error("Not saved")
    if (rating && where === "Completed") {
      // Keep the rating on the book's other copies (for example Recommendations) in step, as the rating control does.
      await supabase.from("books").update({ self_rating: rating }).eq("id", bookId).eq("user_id", userId)
    }
    setBooks((prev) => {
      const updated = { ...prev }
      for (const s of Object.keys(updated) as BookStatus[]) {
        updated[s] = updated[s].map((b) => b.id === bookId ? { ...b, ...(rating ? { selfRating: rating } : {}), ...(where === "Recommendations" || s === "completed" ? { finishedAt, finishedPrecision: precision } : {}) } : b)
      }
      return updated
    })
  }, [userId])

  const saveStart = useCallback(async (bookId: string, startedAt: string) => {
    if (!userId || !isValidDate(startedAt)) throw new Error("Invalid start date")
    const supabase = createClientSupabaseClient()
    const { data, error } = await supabase.from("books").update({ started_at: startedAt, started_precision: "day" }).eq("id", bookId).eq("user_id", userId).select("id")
    if (error) throw error
    if (!data?.length) throw new Error("Not saved")
    setBooks((prev) => {
      const updated = { ...prev }
      for (const s of Object.keys(updated) as BookStatus[]) updated[s] = updated[s].map((b) => b.id === bookId ? { ...b, startedAt, startedPrecision: "day" as DatePrecision } : b)
      return updated
    })
  }, [userId])

  // Edit Details: set, change or clear the start and finish dates (day or month precision). Applies to every list copy of the book.
  const saveDates = useCallback(async (bookId: string, dates: { startedAt?: string | null; startedPrecision?: DatePrecision; finishedAt?: string | null; finishedPrecision?: DatePrecision }) => {
    if (!userId) throw new Error("Not signed in")
    const patch: Record<string, unknown> = {}
    if (dates.startedAt !== undefined) {
      if (dates.startedAt !== null && !isValidDate(dates.startedAt)) throw new Error("Invalid start date")
      patch.started_at = dates.startedAt
      patch.started_precision = dates.startedAt === null ? "day" : dates.startedPrecision ?? "day"
    }
    if (dates.finishedAt !== undefined) {
      if (dates.finishedAt !== null && !isValidDate(dates.finishedAt)) throw new Error("Invalid finish date")
      patch.finished_at = dates.finishedAt
      patch.finished_precision = dates.finishedAt === null ? "day" : dates.finishedPrecision ?? "day"
    }
    if (!Object.keys(patch).length) return
    const supabase = createClientSupabaseClient()
    const { data, error } = await supabase.from("books").update(patch).eq("id", bookId).eq("user_id", userId).select("id")
    if (error) throw error
    if (!data?.length) throw new Error("Not saved")
    setBooks((prev) => {
      const updated = { ...prev }
      for (const st of Object.keys(updated) as BookStatus[]) updated[st] = updated[st].map((b) => b.id !== bookId ? b : {
        ...b,
        ...(dates.startedAt !== undefined ? { startedAt: dates.startedAt ?? undefined, startedPrecision: (dates.startedAt === null ? "day" : dates.startedPrecision ?? "day") as DatePrecision } : {}),
        ...(dates.finishedAt !== undefined ? { finishedAt: dates.finishedAt ?? undefined, finishedPrecision: (dates.finishedAt === null ? "day" : dates.finishedPrecision ?? "day") as DatePrecision } : {}),
      })
      return updated
    })
  }, [userId])

  const getBooksByStatus = (status: BookStatus) => books[status] || []
  const getBookCountByStatus = (status: BookStatus) => books[status]?.length || 0

  return (
    <BookContext.Provider value={{ books, addBook, moveBook: addBook, createBook, editBook, saveDates, removeBook, getBooksByStatus, getBookCountByStatus, loading, loadError, reloadBooks, updateNote, updateRating }}>
      {children}
      {ratingPrompt && <RecommendationRatingDialog key={ratingPrompt.id} book={ratingPrompt} onSave={(rating) => updateRating(ratingPrompt.id, rating)} onClose={() => setRatingPrompt(null)} />}
      {finishPrompt && !ratingPrompt && <FinishBookDialog key={finishPrompt.id} book={finishPrompt} direct={finishPrompt.direct} onSave={(rating, date, precision) => saveFinish(finishPrompt.id, rating, date, finishPrompt.where, precision)} onClose={() => setFinishPrompt(null)} />}
      {startPrompt && !ratingPrompt && !finishPrompt && <StartBookDialog key={startPrompt.id} book={startPrompt} onSave={(date) => saveStart(startPrompt.id, date)} onClose={() => setStartPrompt(null)} />}
    </BookContext.Provider>
  )
}

export function useBooks() {
  const context = useContext(BookContext)
  if (context === undefined) throw new Error("useBooks must be used within a BookProvider")
  return context
}

