"use client"
import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useBooks, mapTabToStatus } from "@/lib/book-context"
import BookCard from "@/components/book-card"
import BookSearch from "@/components/book-search"
import type { Book } from "@/types"
import { Sidebar } from "@/components/sidebar"
import { LayoutGrid, List } from "lucide-react"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import { getAIBookRecommendations } from "@/app/actions/ai-recommendations"
import type { BookSearchResult } from "@/types"
import { Textarea } from "@/components/ui/textarea"
import { useBooks as useBooksContext, type BookStatus } from "@/lib/book-context"
import { useAuth } from "@/components/auth/auth-provider"
import { createClientSupabaseClient } from "@/lib/supabase/client"

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
          {book.genre && (
            <span style={{
              display: "inline-block",
              fontSize: "10px",
              fontWeight: 500,
              color: "#8a5a1e",
              background: "#f5ede0",
              border: "0.5px solid #d4a96a",
              borderRadius: "10px",
              padding: "2px 7px",
              marginTop: "3px",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {book.genre}
            </span>
          )}
        </div>
        {(book.status === "completed" || book.status === "recommended") && (
          <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`cursor-pointer text-base md:text-lg ${star <= rating ? "text-amber-400" : "text-gray-300"}`}
                onClick={() => handleStarClick(star)}
              >
                ★
              </span>
            ))}
          </div>
        )}

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

function generateBookColor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 80%)`
}

function DiscoverTab() {
  const [prompt, setPrompt] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [recommendations, setRecommendations] = React.useState<BookSearchResult[] | null>(null)
  const [selectedBook, setSelectedBook] = React.useState<BookSearchResult | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const results = await getAIBookRecommendations(prompt)
      setRecommendations(results)
    } catch (err) {
      setError("Sorry, we couldn't generate recommendations. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Prompt panel */}
      <div style={{ background: "#fff", border: "0.5px solid #e0d5c4", borderRadius: "10px", padding: "1.25rem" }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: "#1a1208", fontWeight: "normal", marginBottom: "0.75rem" }}>Tell us what you like</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="I enjoy literary fiction with strong character development..."
            style={{ flex: 1, minHeight: "70px", maxHeight: "70px", fontSize: "13px", border: "0.5px solid #d4c5a9", borderRadius: "7px", background: "#faf7f2", color: "#1a1208", resize: "none" }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{ padding: "9px 18px", background: isLoading ? "#d4a574" : "#c17f3e", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "500", cursor: isLoading ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif", whiteSpace: "nowrap", flexShrink: 0, height: "70px" }}
          >
            {isLoading ? "Generating..." : "Get Recommendations"}
          </button>
        </form>
      </div>

      {/* Results panel */}
      {(isLoading || error || recommendations) && <div style={{ overflow: "auto" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <div style={{ width: "32px", height: "32px", border: "2.5px solid #e0d5c4", borderTopColor: "#c17f3e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ marginTop: "0.875rem", fontSize: "13px", color: "#8a7560" }}>Analysing your preferences...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{ background: "#fdf2f2", border: "0.5px solid #e8c4c4", borderRadius: "10px", padding: "1.25rem" }}>
            <p style={{ fontSize: "13px", color: "#a04040" }}>{error}</p>
          </div>
        ) : recommendations ? (
          <div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: "#1a1208", fontWeight: "normal", marginBottom: "0.875rem" }}>Your recommendations</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {recommendations.map((book, index) => (
                <div
                  key={index}
                  onClick={() => { setSelectedBook(book); setDialogOpen(true) }}
                  style={{ background: "#fff", border: "0.5px solid #e0d5c4", borderRadius: "8px", display: "flex", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(193,127,62,0.10)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div style={{ width: "70px", minWidth: "70px", height: "100px", background: "#f3ede3", overflow: "hidden", flexShrink: 0 }}>
                    {book.cover ? (
                      <img src={book.cover} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", background: generateBookColor(book.title), display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "1rem" }}>
                        {(book.title.charAt(0) + book.author.split(" ")[0].charAt(0)).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div style={{ padding: "0.75rem 1rem", flex: 1 }}>
                    <h3 style={{ fontSize: "13px", fontWeight: "500", color: "#1a1208", marginBottom: "2px" }}>{book.title}</h3>
                    <p style={{ fontSize: "11px", color: "#c17f3e", marginBottom: "5px" }}>by {book.author}</p>
                    <p style={{ fontSize: "11px", color: "#6b5c42", lineHeight: "1.55" }}>{book.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: "#f3ede3", border: "0.5px solid #e0d5c4", borderRadius: "10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "2rem" }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="3" y="17" width="22" height="5" rx="1.5" fill="#c17f3e" opacity="0.3" />
              <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="#c17f3e" opacity="0.18" />
              <rect x="3" y="4" width="12" height="5" rx="1.5" fill="#c17f3e" opacity="0.1" />
            </svg>
            <p style={{ fontSize: "12px", color: "#8a7560", lineHeight: "1.65", marginTop: "0.75rem", maxWidth: "240px" }}>
              Describe what you enjoy and click "Get Recommendations" to see personalised suggestions.
            </p>
          </div>
        )}
      </div>}
      <BookDetailsDialog book={selectedBook} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="add" />
    </div>
  )
}

const GENRES_INITIAL_COUNT = 5

function GenreFilterRow({ selected, onSelect, expanded, onToggleExpand, genres }: {
  selected: string
  onSelect: (g: string) => void
  expanded: boolean
  onToggleExpand: () => void
  genres: string[]
}) {
  const visibleGenres = expanded ? genres : genres.slice(0, GENRES_INITIAL_COUNT)
  const pillStyle = (g: string): React.CSSProperties => ({
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    background: selected === g ? "#f5ede0" : "transparent",
    color: selected === g ? "#8a5a1e" : "#8a7560",
    border: selected === g ? "1px solid #c17f3e" : "0.5px solid #d4c5a9",
    flexShrink: 0,
  })
  const morePillStyle: React.CSSProperties = {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 500,
    whiteSpace: "nowrap",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    background: "#e8e0d5",
    color: "#5a4a38",
    border: "0.5px solid #c8b89a",
    flexShrink: 0,
  }
  return (
    <>
      {/* Desktop: wrap + More */}
      <div className="hidden md:flex flex-wrap gap-2 items-center" style={{ borderTop: "0.5px solid #e0d5c4", paddingTop: "10px", marginBottom: "12px" }}>
        {visibleGenres.map(g => (
          <span key={g} style={pillStyle(g)} onClick={() => onSelect(g)}>{g}</span>
        ))}
        {genres.length > GENRES_INITIAL_COUNT && (
          !expanded
            ? <span style={morePillStyle} onClick={onToggleExpand}>+ More</span>
            : <span style={{ ...morePillStyle, marginLeft: "4px" }} onClick={onToggleExpand}>− Less</span>
        )}
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-1" style={{ borderTop: "0.5px solid #e0d5c4", paddingTop: "10px", marginBottom: "12px", scrollbarWidth: "none" }}>
        {genres.map(g => (
          <span key={g} style={pillStyle(g)} onClick={() => onSelect(g)}>{g}</span>
        ))}
      </div>
    </>
  )
}

export default function BooksPage() {
  const [activeTab, setActiveTab]   = useState("Reading")
  const [sidebarTab, setSidebarTab] = useState("my-books")
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid")
  const [myBooksGenreFilter, setMyBooksGenreFilter]               = useState<string>("All")
  const [recommendedGenreFilter, setRecommendedGenreFilter]       = useState<string>("All")
  const [myBooksGenreExpanded, setMyBooksGenreExpanded]           = useState(false)
  const [recommendedGenreExpanded, setRecommendedGenreExpanded]   = useState(false)

  useEffect(() => {
    const savedTab = localStorage.getItem("booklog-active-tab")
    if (savedTab) { setActiveTab(savedTab); localStorage.removeItem("booklog-active-tab") }
    const savedView = localStorage.getItem("booklog-view-mode")
    if (savedView === "list" || savedView === "grid") setViewMode(savedView)
  }, [])

  const { getBooksByStatus, getBookCountByStatus, removeBook, books } = useBooks()

  const userGenres = React.useMemo(() => {
    const allBooks = Object.values(books).flat()
    const genres = Array.from(new Set(allBooks.map(b => b.genre).filter(Boolean))) as string[]
    genres.sort()
    return ["All", ...genres]
  }, [books])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [shareUsername, setShareUsername] = useState("")
  const [sharingOn, setSharingOn]         = useState(false)
  const [shareCopied, setShareCopied]     = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    async function fetchShareProfile() {
      if (!user) return
      const supabase = createClientSupabaseClient()
      const { data } = await supabase
        .from("profiles")
        .select("username, profile_visibility")
        .eq("user_id", user.id)
        .single()
      if (data) {
        setShareUsername(data.username || "")
        setSharingOn(data.profile_visibility === "public")
      }
    }
    fetchShareProfile()
  }, [user])

  const handleShare = useCallback(() => {
    if (!sharingOn || !shareUsername) {
      router.push("/settings")
      return
    }
    navigator.clipboard.writeText(`https://booklogapp.com/u/${shareUsername}`)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }, [sharingOn, shareUsername, router])

  useEffect(() => {
    const genreFilter = sidebarTab === "recommended" ? recommendedGenreFilter : myBooksGenreFilter
    const raw = sidebarTab === "recommended"
      ? getBooksByStatus("recommended")
      : getBooksByStatus(mapTabToStatus(activeTab))
    setFilteredBooks(genreFilter === "All" ? raw : raw.filter(b => b.genre === genreFilter))
  }, [activeTab, sidebarTab, getBooksByStatus, myBooksGenreFilter, recommendedGenreFilter])

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
    sidebarTab === "recommended" ? "My Recommendations" :
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

          {/* Page title + share button */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold" style={{ ...serif, color: "#2d2416" }}>
              {pageTitle}
            </h1>
            {sidebarTab !== "discover" && <button
              onClick={handleShare}
              className="p-1.5 md:px-3.5 md:py-1.5"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "0.5px solid #c17f3e",
                borderRadius: "7px",
                cursor: "pointer",
                fontSize: "12px",
                color: "#c17f3e",
                fontWeight: "600",
                fontFamily: "'DM Sans', sans-serif",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c17f3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span className="hidden md:inline">{shareCopied ? "Copied!" : "Share profile"}</span>
            </button>}
          </div>

          {/* MY BOOKS */}
          {sidebarTab === "my-books" && (
            <>
              <div className="mb-5">
                <BookSearch />
              </div>
              <div className="flex items-center justify-between mb-3">
                <ul className="flex gap-2 overflow-x-auto md:flex-wrap" style={{ scrollbarWidth: "none", flexShrink: 1, minWidth: 0 }}>
                  {tabs.map((tab) => (
                    <li
                      key={tab.name}
                      onClick={() => setActiveTab(tab.name)}
                      className="cursor-pointer px-4 py-2 rounded-full text-sm transition-colors flex-shrink-0"
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
              <GenreFilterRow
                selected={myBooksGenreFilter}
                onSelect={setMyBooksGenreFilter}
                expanded={myBooksGenreExpanded}
                onToggleExpand={() => setMyBooksGenreExpanded(e => !e)}
                genres={userGenres}
              />
              {viewMode === "grid" ? gridView(filteredBooks) : listView(filteredBooks)}
            </>
          )}

          {/* MY RECOMMENDATIONS */}
          {sidebarTab === "recommended" && (
            <>
              <div className="mb-5">
                <BookSearch />
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-4 py-2 rounded-full text-sm" style={{ ...sans, background: "#c17f3e", color: "white", fontWeight: "600" }}>
                  My Recommendations ({recommendedCount})
                </span>
                {viewToggle}
              </div>
              <GenreFilterRow
                selected={recommendedGenreFilter}
                onSelect={setRecommendedGenreFilter}
                expanded={recommendedGenreExpanded}
                onToggleExpand={() => setRecommendedGenreExpanded(e => !e)}
                genres={userGenres}
              />
              {viewMode === "grid" ? gridView(filteredBooks) : listView(filteredBooks)}
            </>
          )}

          {/* DISCOVER */}
          {sidebarTab === "discover" && (
            <DiscoverTab />
          )}

        </div>
      </main>
    </div>
  )
}
