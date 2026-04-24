"use client"
import { useState, useEffect } from "react"
import { useBooks, mapTabToStatus } from "@/lib/book-context"
import BookCard from "@/components/book-card"
import BookSearch from "@/components/book-search"
import type { Book } from "@/types"
import { Sidebar } from "@/components/sidebar"
import { LayoutGrid, List } from "lucide-react"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import { useBooks as useBooksContext, type BookStatus } from "@/lib/book-context"
import { AiRecommendationCard } from "@/components/ai-recommendation-card"

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
const sans  = { fontFamily: "'DM Sans', sans-serif" }

function BookListRow({ book, removeBook }: { book: Book; removeBook: (id: string, status: BookStatus, rowId?: string) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [rating, setRating] = useState<number>(book.selfRating || 0)
  useEffect(() => { setRating(book.selfRating || 0) }, [book.selfRating])
  const { addBook, updateRating } = useBooksContext()

  const handleStarClick = async (star: number) => {
    setRating(star)
    await updateRating(book.id, star)
  }

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
          <p className="font-semibold text-sm truncate" style={sans}>{book.title}</p>
          <p className="text-xs text-gray-500 truncate" style={sans}>{book.author}</p>
        </div>
        {(book.status === "completed" || book.status === "recommended") && (
          <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`cursor-pointer text-lg ${star <= rating ? "text-amber-400" : "text-gray-300"}`}
                onClick={() => handleStarClick(star)}
              >
                ★
              </span>
            ))}
          </div>
        )}
        <span className="inline-block bg-amber-50 text-amber-800 text-xs px-2 py-0.5 rounded capitalize flex-shrink-0" style={sans}>
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
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50" style={sans}>
              {book.status !== "reading"     && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("reading")}>Move to Reading</div>}
              {book.status !== "queued"      && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("queued")}>Move to Queued</div>}
              {book.status !== "completed"   && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("completed")}>Move to Completed</div>}
              {book.status !== "recommended" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("recommended")}>Move to Recommendations</div>}
              {book.status !== "onHold"      && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("onHold")}>Move to On Hold</div>}
              <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer text-red-500" onClick={() => { removeBook(book.id, book.status, book.rowId); setDropdownOpen(false) }}>Remove</div>
            </div>
          )}
        </div>
      </div>
      <BookDetailsDialog book={book} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="view" />
    </>
  )
}

export default function BooksPage() {
  const [activeTab, setActiveTab]   = useState("Reading")
  const [sidebarTab, setSidebarTab] = useState("my-books")
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid")

  useEffect(() => {
    const savedTab = localStorage.getItem("booklog-active-tab")
    if (savedTab) { setActiveTab(savedTab); localStorage.removeItem("booklog-active-tab") }
    const savedView = localStorage.getItem("booklog-view-mode")
    if (savedView === "list" || savedView === "grid") setViewMode(savedView)
  }, [])

  const { getBooksByStatus, getBookCountByStatus, removeBook } = useBooks()
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])

  useEffect(() => {
    if (sidebarTab === "recommended") {
      setFilteredBooks(getBooksByStatus("recommended"))
    } else {
      setFilteredBooks(getBooksByStatus(mapTabToStatus(activeTab)))
    }
  }, [activeTab, sidebarTab, getBooksByStatus])

  const tabs = [
    { name: "Reading",   count: getBookCountByStatus("reading")   },
    { name: "Queued",    count: getBookCountByStatus("queued")    },
    { name: "Completed", count: getBookCountByStatus("completed") },
    { name: "On Hold",   count: getBookCountByStatus("onHold")   },
  ]

  const toggleView = (mode: "grid" | "list") => {
    setViewMode(mode)
    localStorage.setItem("booklog-view-mode", mode)
  }

  const handleSidebarTab = (tab: string) => {
    setSidebarTab(tab)
    if (tab === "my-books") setActiveTab("Reading")
  }

  const recommendedCount = getBookCountByStatus("recommended")
  const pageTitle =
    sidebarTab === "recommended" ? `My Recommendations (${recommendedCount})` :
    sidebarTab === "discover"    ? "Discover"           :
    "My Books"

  const viewToggle = (
    <div className="flex items-center gap-1">
      <button onClick={() => toggleView("grid")} className={`p-2 rounded ${viewMode === "grid" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`} title="Grid view"><LayoutGrid size={15} /></button>
      <button onClick={() => toggleView("list")} className={`p-2 rounded ${viewMode === "list" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`} title="List view"><List size={15} /></button>
    </div>
  )

  const gridView = (books: Book[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
      {books.map((book) => <BookCard key={book.id} book={book} removeBook={removeBook} />)}
      {books.length === 0 && <div className="col-span-full text-gray-400 text-center py-12" style={sans}>No books here yet.</div>}
    </div>
  )

  const listView = (books: Book[]) => (
    <div className="flex flex-col gap-2 mt-4">
      {books.map((book) => <BookListRow key={book.id} book={book} removeBook={removeBook} />)}
      {books.length === 0 && <div className="text-gray-400 text-center py-12" style={sans}>No books here yet.</div>}
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: "#faf7f2" }}>
      <Sidebar activeTab={sidebarTab} onTabChange={handleSidebarTab} />

      <main className="flex-1 overflow-auto pb-20 md:pb-0" style={{ background: "#f7f4ef" }}>
        <div className="px-8 py-8 w-full">

          {/* Page title */}
          <h1 className="text-2xl font-bold mb-6" style={{ ...serif, color: "#2d2416" }}>
            {pageTitle}
          </h1>

          {/* MY BOOKS */}
          {sidebarTab === "my-books" && (
            <>
              <div className="mb-5">
                <BookSearch />
              </div>
              <div className="flex items-center justify-between mb-3">
                <ul className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <li
                      key={tab.name}
                      onClick={() => setActiveTab(tab.name)}
                      className="cursor-pointer px-4 py-2 rounded-full text-sm transition-colors"
                      style={{
                        ...sans,
                        background: activeTab === tab.name ? "#c17f3e" : "#ede6dc",
                        color:      activeTab === tab.name ? "white"   : "#6b5c4e",
                        fontWeight: activeTab === tab.name ? "600"     : "500",
                      }}
                    >
                      {tab.name} ({tab.count})
                    </li>
                  ))}
                </ul>
                {viewToggle}
              </div>
              {viewMode === "grid" ? gridView(filteredBooks) : listView(filteredBooks)}
            </>
          )}

          {/* MY RECOMMENDATIONS */}
          {sidebarTab === "recommended" && (
            <>
              <div className="mb-5">
                <BookSearch />
              </div>
              <div className="flex justify-end mb-3">{viewToggle}</div>
              {viewMode === "grid" ? gridView(filteredBooks) : listView(filteredBooks)}
            </>
          )}

          {/* DISCOVER */}
          {sidebarTab === "discover" && (
            <div className="max-w-sm">
              <AiRecommendationCard />
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
