"use client"

import { useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
import type { BookSearchResult } from "@/lib/google-books-api"
import { searchBooks, getBookById } from "@/lib/google-books-api"
import { useDebounce } from "@/hooks/use-debounce"
import { BookDetailsDialog } from "@/components/book-details-dialog-fix"
import { Button } from "@/components/ui/button"

interface BookSearchProps {
  setUpdateCounter: React.Dispatch<React.SetStateAction<number>>
}

export default function BookSearch({ setUpdateCounter }: BookSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<BookSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const searchRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Fetch books on debounced input
  useEffect(() => {
    const fetchBooks = async () => {
      if (debouncedQuery.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        const books = await searchBooks(debouncedQuery)
        setResults(books)
        setShowResults(true)
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBooks()
  }, [debouncedQuery])

  const handleBookSelect = async (book: BookSearchResult) => {
    setIsLoading(true)
    setShowResults(false)

    try {
      const fullBook = await getBookById(book.id)
      setSelectedBook(fullBook || book)
      setDialogOpen(true)
    } catch (error) {
      console.error("Book select error:", error)
      setSelectedBook(book)
      setDialogOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim().length >= 2) {
      setShowResults(true)
    }
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedBook(null)
  }

  return (
    <div className="relative" ref={searchRef}>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search for books or authors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setResults([])
                setShowResults(false)
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
        <Button type="submit" className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </form>

      {isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-r-transparent" />
          <p className="mt-2 text-sm text-gray-600">Searching...</p>
        </div>
      )}

      {showResults && results.length > 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-96 overflow-y-auto">
          {results.map((book, index) => (
            <div
              key={book.id}
              className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleBookSelect(book)}
            >
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-10 h-14 object-cover mr-3"
                  onError={(e) => {
                    const target = e.currentTarget
                    const fallbackUrl = `https://covers.openlibrary.org/b/title/${encodeURIComponent(book.title)}-M.jpg`
                    target.src = fallbackUrl
                  }}
                />
              ) : (
                <div className="w-10 h-14 bg-gray-200 flex items-center justify-center text-gray-500 text-[10px]">
                  {book.title.charAt(0)}
                  {book.author.charAt(0)}
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

      {selectedBook && (
        <BookDetailsDialog
          book={{ ...selectedBook, 
            cover: selectedBook.cover || ""
           // genre: selectedBook.genre || "" 
           }}
          open={dialogOpen}
          onClose={handleCloseDialog}
          onBookAdded={() => setUpdateCounter((prev) => prev + 1)}
          mode="add"
        />
      )}
    </div>
  )
}
