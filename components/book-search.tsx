"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import type { BookSearchResult } from "@/lib/google-books-api"
import { searchBooks, getBookById } from "@/lib/google-books-api"
import { useDebounce } from "@/hooks/use-debounce"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import { Button } from "@/components/ui/button"

export default function BookSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 500)

  useEffect(() => {
    async function fetchBooks() {
      if (debouncedQuery.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const books = await searchBooks(debouncedQuery)
        setResults(books)
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
      // Get full book details
      const fullBook = await getBookById(book.id)
      if (fullBook) {
        setSelectedBook(fullBook)
      } else {
        // If we couldn't get full details, use the search result
        setSelectedBook(book)
      }
      setDialogOpen(true)
    } catch (error) {
      console.error("Error getting book details:", error)
      // Fallback to using the search result if there's an error
      setSelectedBook(book)
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
        <Button type="submit" className="flex items-center gap-2">
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
              </div>
            </div>
          ))}
        </div>
      )}

      <BookDetailsDialog book={selectedBook} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="add" />
    </div>
  )
}
