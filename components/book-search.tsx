"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Search } from "lucide-react"
import type { BookSearchResult } from "@/lib/google-books-api"
import { searchBooks, getBookById } from "@/lib/google-books-api"
import { useDebounce } from "@/hooks/use-debounce"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import { Button } from "@/components/ui/button"
import { useBooks } from "@/lib/book-context"

export default function BookSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null)
  const [selectedBookInLibrary, setSelectedBookInLibrary] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 500)

  const { books } = useBooks()
  const allMyBooks = useMemo(() => Object.values(books).flat(), [books])

  const normalise = (s: string) => s.trim().toLowerCase()
  const baseTitle = (s: string) => normalise(s).replace(/\s*:.*$/, "")

  const findInLibrary = (id: string, title: string, author: string) =>
    allMyBooks.find(b =>
      b.id === id ||
      (baseTitle(b.title) === baseTitle(title) && normalise(b.author) === normalise(author))
    )

  const statusLabel: Record<string, string> = {
    reading:     "Reading",
    queued:      "Queued",
    completed:   "Completed",
    recommended: "Recommendations",
    onHold:      "On Hold",
  }

  useEffect(() => {
    async function fetchBooks() {
      if (debouncedQuery.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const books = await searchBooks(debouncedQuery)
        const seen = new Set<string>()
        const unique = books.filter((b) => {
          const key = `${b.title.trim().toLowerCase()}||${b.author.trim().toLowerCase()}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setResults(unique)
      } catch (error) {
        console.error("Error searching books:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBooks()
  }, [debouncedQuery])

  const handleBookSelect = async (book: BookSearchResult) => {
    try {
      setIsLoading(true)
      const fullBook = await getBookById(book.id)
      const resolved = fullBook ?? book
      setSelectedBook(resolved)
      setSelectedBookInLibrary(!!findInLibrary(resolved.id, resolved.title, resolved.author))
      setDialogOpen(true)
    } catch (error) {
      console.error("Error getting book details:", error)
      setSelectedBook(book)
      setSelectedBookInLibrary(!!findInLibrary(book.id, book.title, book.author))
      setDialogOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Trigger search with current query
    if (query.trim().length >= 2) {
      searchBooks(query)
    }
  }

  return (
    <div className="relative">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search for books or authors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
        </div>
        <Button type="submit" className="flex items-center gap-2" style={{ background: "#c17f3e", color: "#fff", border: "none", fontFamily: "'DM Sans', sans-serif", fontWeight: "600", fontSize: "13px", borderRadius: "8px", padding: "8px 16px" }}>
          <Search className="h-4 w-4" />
          Search
        </Button>
      </form>

      {results.length > 0 && query.length >= 2 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-96 overflow-y-auto">
          {results.map((book) => (
            <div
              key={book.id}
              className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
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
                    target.style.backgroundColor = "#e5e7eb"
                    target.style.display = "flex"
                    target.style.alignItems = "center"
                    target.style.justifyContent = "center"
                    target.style.color = "#6b7280"
                    target.style.fontSize = "10px"
                    target.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
                  }}
                />
              ) : (
                <div className="w-10 h-14 bg-gray-200 flex items-center justify-center text-gray-500 text-[10px] mr-3">
                  No Cover
                </div>
              )}
              <div>
                <div className="font-medium">{book.title}</div>
                <div className="text-sm text-gray-600">{book.author}</div>
                {(() => {
                  const match = findInLibrary(book.id, book.title, book.author)
                  if (!match) return null
                  return (
                    <span style={{
                      display: "inline-block", fontSize: "10px", fontWeight: 500,
                      color: "#8a5a1e", background: "#f5ede0",
                      border: "0.5px solid #c17f3e", borderRadius: "10px",
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

      <BookDetailsDialog book={selectedBook} open={dialogOpen} onClose={() => { setDialogOpen(false); setQuery(""); setResults([]); setSelectedBookInLibrary(false) }} mode={selectedBookInLibrary ? "view" : "add"} />
    </div>
  )
}
