"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { sameBook } from "@/lib/book-identity"
import { BookBarcodeScanner } from "@/components/book-barcode-scanner"
import { Search } from "lucide-react"
import type { BookSearchResult } from "@/lib/google-books-api"
import { searchBooks, getBookById } from "@/lib/google-books-api"
import { useDebounce } from "@/hooks/use-debounce"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import { Button } from "@/components/ui/button"
import { useBooks } from "@/lib/book-context"

export default function BookSearch() {
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchAttempt, setSearchAttempt] = useState(0)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null)
  const [selectedBookInLibrary, setSelectedBookInLibrary] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [fromScan, setFromScan] = useState(false)
  const debouncedQuery = useDebounce(query, 500)

  const { books } = useBooks()
  const allMyBooks = useMemo(() => Object.values(books).flat(), [books])

  const findInLibrary = (id: string, title: string, author: string) => allMyBooks.find(b => sameBook(b, {id, title, author}))

  const statusLabel: Record<string, string> = {
    reading:     "Reading",
    queued:      "Queued",
    completed:   "Completed",
    recommended: "Recommendations",
    onHold:      "On Hold",
  }

  useEffect(() => {
    let active = true
    async function fetchBooks() {
      if (debouncedQuery.length < 2) {
        setResults([])
        setSearchError(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setSearchError(null)
      try {
        const books = await searchBooks(debouncedQuery)
        const seen = new Set<string>()
        const unique = books.filter((b) => {
          const key = `${b.title.trim().toLowerCase()}||${b.author.trim().toLowerCase()}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        if (active) setResults(unique)
      } catch (error) {
        if (active) { setResults([]); setSearchError("Search is unavailable. Please try again.") }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    fetchBooks()
    return () => { active = false }
  }, [debouncedQuery, searchAttempt])

const handleBookSelect = async (book: BookSearchResult) => {
    setFromScan(false)
    const owned = findInLibrary(book.id, book.title, book.author)
    if (owned) { setSelectedBook(owned as BookSearchResult); setSelectedBookInLibrary(true); setDialogOpen(true); return }
    // Open the dialog instantly with the search result; enrich in the background.
    // getBookById can take seconds when Google Books is flapping (or returns null fast
    // while the circuit breaker is open) - neither should block the click.
    setSelectedBook(book)
    setSelectedBookInLibrary(false)
    setDialogOpen(true)
    try {
      const fullBook = await getBookById(book.id)
      if (fullBook) {
        // Both updates must share the staleness guard: a slow enrichment from an earlier
        // click must not touch the book (or its add/view mode) now showing in the dialog.
        setSelectedBook(prev => {
          if (!prev || prev.id !== book.id) return prev
          setSelectedBookInLibrary(!!findInLibrary(fullBook.id, fullBook.title, fullBook.author))
          return fullBook
        })
      }
    } catch {
      // The dialog already shows the search result; enrichment is best-effort.
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Trigger search with current query
    if (query.trim().length >= 2) {
      setSearchAttempt((attempt) => attempt + 1)
    }
  }

  return (
    <div className="relative">
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <div className="flex-1 relative min-w-0 max-md:basis-full">
          <input
            type="text"
            placeholder="Search books or authors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-background text-foreground placeholder:text-muted-foreground border border-input rounded-lg px-4 py-2 pr-[5.5rem] md:pr-10 max-md:py-3 max-md:text-base"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-14 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-muted-foreground"
              aria-label="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
          <BookBarcodeScanner onSearch={() => { document.querySelector<HTMLInputElement>('input[placeholder="Search books or authors"]')?.focus() }} onBook={book => { const owned = findInLibrary(book.id, book.title, book.author); setSelectedBook((owned ?? book) as BookSearchResult); setSelectedBookInLibrary(!!owned); setFromScan(!owned); setDialogOpen(true) }} />
        </div>
        <Button type="submit" className="flex items-center gap-2" style={{ background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "none", fontFamily: "'DM Sans', sans-serif", fontWeight: "600", fontSize: "13px", borderRadius: "8px", padding: "8px 16px" }}>
          <Search className="h-4 w-4" />
          <span className="max-md:sr-only">Search</span>
        </Button>
        <Link href="/books/add" className="inline-flex items-center rounded-lg border px-3 py-2 text-sm text-primary max-md:px-2 max-md:py-1.5 max-md:text-xs">Add manually</Link>
      </form>

{searchError && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-300">{searchError} <Link href="/books/add" className="underline">Add manually instead</Link>.</p>}
{isLoading && query.length >= 2 && (
        <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg px-4 py-3 text-sm text-muted-foreground" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Searching...
        </div>
      )}
      {!isLoading && results.length > 0 && query.length >= 2 && (        <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-96 overflow-y-auto">
          {results.map((book) => (
            <div
              key={book.id}
              className="flex items-center p-3 hover:bg-accent cursor-pointer"
              onClick={() => handleBookSelect(book)}
            >
              {book.cover ? (
                <img
                  src={book.cover || "/placeholder.svg"}
                  alt={book.title}
                  className="w-10 h-14 object-cover mr-3"
                  onError={(e) => {
                    // Simple fallback for failed images
                    const target = e.currentTarget
                    target.onerror = null
                    target.style.backgroundColor = "var(--bl-e5e7eb)"
                    target.style.display = "flex"
                    target.style.alignItems = "center"
                    target.style.justifyContent = "center"
                    target.style.color = "var(--bl-6b7280)"
                    target.style.fontSize = "10px"
                    target.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
                  }}
                />
              ) : (
                <div className="w-10 h-14 bg-muted flex items-center justify-center text-muted-foreground text-[10px] mr-3">
                  No Cover
                </div>
              )}
              <div>
                <div className="font-medium">{book.title}</div>
                <div className="text-sm text-muted-foreground">{book.author}</div>
                {(() => {
                  const match = findInLibrary(book.id, book.title, book.author)
                  if (!match) return null
                  return (
                    <span style={{
                      display: "inline-block", fontSize: "10px", fontWeight: 500,
                      color: "var(--bl-8a5a1e)", background: "var(--bl-f5ede0)",
                      border: "0.5px solid var(--bl-c17f3e)", borderRadius: "10px",
                      padding: "2px 8px", marginTop: "4px",
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      In your library · {statusLabel[match.status] ?? match.status}
                    </span>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      <BookDetailsDialog book={selectedBook} open={dialogOpen} onClose={() => { setDialogOpen(false); setQuery(""); setResults([]); setSelectedBookInLibrary(false); setFromScan(false) }} latestEditionNotice={fromScan} mode={selectedBookInLibrary ? "view" : "add"} />
    </div>
  )
}
