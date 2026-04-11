"use client"
import { useState, useEffect } from "react"
import { useBooks, mapTabToStatus } from "@/lib/book-context"
import BookCard from "@/components/book-card"
import BookSearch from "@/components/book-search"
import type { Book } from "@/types"
import { AiRecommendationCard } from "@/components/ai-recommendation-card"
import { BooksHeader } from "@/components/books-header"
import { LayoutGrid, List } from "lucide-react"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import { useBooks as useBooksContext, type BookStatus } from "@/lib/book-context"

function BookListRow({ book, removeBook }: { book: Book; removeBook: (id: string) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { addBook } = useBooksContext()

  const moveBook = (status: BookStatus) => {
    if (book.status === status) return
    addBook(book, status)
    setDropdownOpen(false)
  }

  return (
    <>
      <div
        className="flex items-center gap-4 bg-white rounded-lg shadow-sm px-4 py-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setDialogOpen(true)}
      >
        <div className="w-10 h-14 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
          {book.cover ? (
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">?</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{book.title}</p>
          <p className="text-xs text-gray-500 truncate">{book.author}</p>
        </div>
        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded capitalize flex-shrink-0">
          {book.status}
        </span>
        <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            •••
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
              {book.status !== "reading" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("reading")}>Move to Reading</div>}
              {book.status !== "queued" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("queued")}>Move to Queued</div>}
              {book.status !== "completed" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("completed")}>Move to Completed</div>}
              {book.status !== "recommended" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("recommended")}>Move to Recommendations</div>}
              {book.status !== "onHold" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("onHold")}>Move to On Hold</div>}
              <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer text-red-500" onClick={() => { removeBook(book.id); setDropdownOpen(false) }}>Remove</div>
            </div>
          )}
        </div>
      </div>
      <BookDetailsDialog book={book} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="view" />
    </>
  )
}

export default function BooksPage() {
  const [activeTab, setActiveTab] = useState("Reading")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  useEffect(() => {
    const savedTab = localStorage.getItem("booklog-active-tab")
    if (savedTab) {
      setActiveTab(savedTab)
      localStorage.removeItem("booklog-active-tab")
    }
    const savedView = localStorage.getItem("booklog-view-mode")
    if (savedView === "list" || savedView === "grid") setViewMode(savedView)
  }, [])

  const { getBooksByStatus, getBookCountByStatus, removeBook } = useBooks()
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])

  useEffect(() => {
    const status = mapTabToStatus(activeTab)
    setFilteredBooks(getBooksByStatus(status))
  }, [activeTab, getBooksByStatus])

  const tabs = [
    { name: "Reading", count: getBookCountByStatus("reading") },
    { name: "Queued", count: getBookCountByStatus("queued") },
    { name: "Completed", count: getBookCountByStatus("completed") },
    { name: "My recommendation", count: getBookCountByStatus("recommended") },
    { name: "On Hold", count: getBookCountByStatus("onHold") },
  ]

  const toggleView = (mode: "grid" | "list") => {
    setViewMode(mode)
    localStorage.setItem("booklog-view-mode", mode)
  }

  return (
    <div className="container mx-auto py-10">
      <BooksHeader />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-3/4">
          <div className="mb-4">
            <BookSearch />
          </div>
          <div className="mb-2 flex items-center justify-between">
            <ul className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <li
                  key={tab.name}
                  className={`cursor-pointer px-4 py-2 rounded-md ${
                    activeTab === tab.name ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  onClick={() => setActiveTab(tab.name)}
                >
                  {tab.name} ({tab.count})
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={() => toggleView("grid")}
                className={`p-2 rounded ${viewMode === "grid" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                title="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => toggleView("list")}
                className={`p-2 rounded ${viewMode === "list" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600 hover:bg-gray-300"}`}
                title="List view"
              >
                <List size={16} />
              </button>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} removeBook={removeBook} />
              ))}
              {filteredBooks.length === 0 && (
                <div className="col-span-full text-gray-500 text-center py-8">No books in this category.</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 mt-4">
              {filteredBooks.map((book) => (
                <BookListRow key={book.id} book={book} removeBook={removeBook} />
              ))}
              {filteredBooks.length === 0 && (
                <div className="text-gray-500 text-center py-8">No books in this category.</div>
              )}
            </div>
          )}
        </div>
        <div className="lg:w-1/4">
          <AiRecommendationCard />
        </div>
      </div>
    </div>
  )
}
