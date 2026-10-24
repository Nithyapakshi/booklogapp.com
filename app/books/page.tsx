"use client"
import { readingDatesLabel } from "@/lib/reading-dates"
import { showFirstBookPrompt } from "@/lib/library-empty"
import { sameBook } from "@/lib/book-identity"
import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useBooks, mapTabToStatus } from "@/lib/book-context"
import BookCard from "@/components/book-card"
import BookSearch from "@/components/book-search"
import { StarterBooksLine } from "@/components/starter-books"
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
import { prefetchAmazonDomain, getAmazonSearchUrl } from "@/lib/amazon-link"
import { useAmazonUrl } from "@/hooks/use-amazon-url"
import { fetchDiscoverCandidates } from "@/app/actions/discover-rows"
import { getFreeSpiritCandidates } from "@/app/actions/free-spirit"
import { buildRowSpecs, assembleRows, takeTopPick, specsSignature, loadDismissals, bookKey, type Candidate, type Dismissed } from "@/lib/discover-rows"
import { mergeRefreshCandidates, refreshStatus } from "@/lib/discover-refresh"
import { DiscoverRowView, TopPickCard } from "@/components/discover-carousel"

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
const sans  = { fontFamily: "'DM Sans', sans-serif" }

function BookListRow({ book, removeBook }: { book: Book; removeBook: (id: string, status: BookStatus, rowId?: string) => void }) {
  const [editOpen, setEditOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [rating, setRating] = useState<number>(book.selfRating || 0)
  useEffect(() => { setRating(book.selfRating || 0) }, [book.selfRating])
  const { moveBook: moveStoredBook, updateRating } = useBooksContext()
  const amazonUrl = useAmazonUrl(book.title, book.author)

  const handleStarClick = async (star: number) => {
    setWriteError(null)
    try { await updateRating(book.id, star); setRating(star) }
    catch { setWriteError("Rating was not saved. Please try again.") }
  }

  const moveBook = async (status: BookStatus) => {
    if (book.status === status) return
    setWriteError(null)
    try { await moveStoredBook(book, status) }
    catch { setWriteError("Book was not moved. Please try again.") }
    setDropdownOpen(false)
  }

  return (
    <>
      {writeError && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{writeError}</p>}
      <div
        className="flex items-center gap-4 bg-card rounded-lg shadow-sm px-4 py-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setDialogOpen(true)}
      >
        <div className="w-10 h-14 flex-shrink-0 bg-muted rounded overflow-hidden">
          {book.cover ? (
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">?</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={sans}>{book.title}</p>
          <p className="text-xs text-muted-foreground truncate" style={sans}>{book.author}</p>
          {readingDatesLabel(book.startedAt, book.finishedAt, book.startedPrecision, book.finishedPrecision) && <p className="text-xs text-gray-400 truncate" style={sans}>{readingDatesLabel(book.startedAt, book.finishedAt, book.startedPrecision, book.finishedPrecision)}</p>}
          {book.genre && (
            <span style={{
              display: "inline-block",
              fontSize: "10px",
              fontWeight: 500,
              color: "var(--bl-8a5a1e)",
              background: "var(--bl-f5ede0)",
              border: "0.5px solid var(--bl-d4a96a)",
              borderRadius: "10px",
              padding: "2px 7px",
              marginTop: "3px",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {book.genre}
            </span>
          )}
        {(book.status === "queued" || book.status === "recommended") && (
          <a
            href={amazonUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "block",
              fontSize: "11px",
              color: "var(--bl-c17f3e)",
              fontWeight: 500,
              textDecoration: "none",
              marginTop: "5px",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Find on Amazon →
          </a>
        )}
        </div>
        {(book.status === "completed" || book.status === "recommended") && (
          <div className="flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`cursor-pointer text-base md:text-lg ${star <= rating ? "text-amber-400" : "text-muted-foreground/40"}`}
                onClick={() => handleStarClick(star)}
              >
                ★
              </span>
            ))}
          </div>
        )}

        <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            className="p-1 rounded hover:bg-accent text-muted-foreground"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            •••
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-card rounded-md shadow-lg border border-border py-1 z-50" style={sans}>
              <div className="px-4 py-2 text-sm hover:bg-accent cursor-pointer" onClick={()=>{setDropdownOpen(false); setEditOpen(true); setDialogOpen(true)}}>Edit details</div>
              {book.status !== "reading"     && <div className="px-4 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => moveBook("reading")}>Move to Reading</div>}
              {book.status !== "queued"      && <div className="px-4 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => moveBook("queued")}>Move to Queued</div>}
              {book.status !== "completed"   && <div className="px-4 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => moveBook("completed")}>Move to Completed</div>}
              {book.status !== "recommended" && <div className="px-4 py-2 text-sm hover:bg-accent cursor-pointer" title="Moves this book into My Recommendations" onClick={() => moveBook("recommended")}>&#9733; Move to Recommendations</div>}
              {book.status !== "onHold"      && <div className="px-4 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => moveBook("onHold")}>Move to On Hold</div>}
              <div
                className="px-4 py-2 text-sm hover:bg-accent cursor-pointer"
                style={{ color: "var(--bl-c17f3e)" }}
                onClick={(e) => { e.stopPropagation(); window.open(amazonUrl, "_blank", "noopener,noreferrer"); setDropdownOpen(false) }}
              >Find on Amazon</div>
              <div className="px-4 py-2 text-sm hover:bg-accent cursor-pointer text-red-500" onClick={async () => { setWriteError(null); try { await removeBook(book.id, book.status as BookStatus, book.rowId); setDropdownOpen(false) } catch { setWriteError("Book was not removed. Please try again.") } }}>Remove</div>
            </div>
          )}
        </div>
      </div>
      <BookDetailsDialog book={book} open={dialogOpen} onClose={() => {setDialogOpen(false); setEditOpen(false)}} mode="view" initialEdit={editOpen} />
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
  const [selectedBookInLibrary, setSelectedBookInLibrary] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const { user: discoverUser } = useAuth()
  const discoverKey = discoverUser?.id ? `booklog.discover:${discoverUser.id}` : ""
  const restoredRef = React.useRef("")

  // Restore the last Discover session (prompt + every recommendation shown) when coming back to the page.
  React.useEffect(() => {
    if (!discoverKey || restoredRef.current === discoverKey) return
    restoredRef.current = discoverKey
    try {
      const raw = localStorage.getItem(discoverKey)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (typeof saved?.prompt === "string") setPrompt(saved.prompt)
      if (Array.isArray(saved?.recommendations) && saved.recommendations.length) setRecommendations(saved.recommendations)
    } catch {}
  }, [discoverKey])

  const saveDiscover = (nextPrompt: string, nextRecs: BookSearchResult[] | null) => {
    if (!discoverKey) return
    try {
      if (!nextRecs || nextRecs.length === 0) localStorage.removeItem(discoverKey)
      else localStorage.setItem(discoverKey, JSON.stringify({ prompt: nextPrompt, recommendations: nextRecs.slice(0, 60), savedAt: Date.now() }))
    } catch {}
  }

  const { books } = useBooksContext()
  const allMyBooks = React.useMemo(() => Object.values(books).flat(), [books])

  const findInLibrary = (id: string, title: string, author: string) => allMyBooks.find(b => sameBook(b, {id, title, author}))

  const [selectedReason, setSelectedReason] = React.useState<string | undefined>(undefined)
  const [desktop, setDesktop] = React.useState(true)
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const apply = () => setDesktop(mq.matches)
    apply(); mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  // "Not interested" is remembered on this device and feeds every row (and the AI "show more").
  const dismissKey = discoverUser?.id ? `booklog.discover.dismissed:${discoverUser.id}` : ""
  const [dismissed, setDismissed] = React.useState<Dismissed[]>([])
  React.useEffect(() => {
    if (!dismissKey) return
    try { setDismissed(loadDismissals(localStorage.getItem(dismissKey))) } catch {}
  }, [dismissKey])
  const dismissBook = (title: string, author: string) => {
    const next = [...dismissed.filter(d => d.key !== bookKey(title, author)), { key: bookKey(title, author), author }].slice(-300)
    setDismissed(next)
    try { if (dismissKey) localStorage.setItem(dismissKey, JSON.stringify(next)) } catch {}
  }

  // Personalised rows: which rows qualify comes from the library; candidates come from Google Books (cached 3 days per row set; failed fetches retry after 1h).
  const libForRows = React.useMemo(() => allMyBooks.map(b => ({ id: b.id, title: b.title, author: b.author, status: b.status, selfRating: b.selfRating, genre: b.genre })), [allMyBooks])
  const specs = React.useMemo(() => buildRowSpecs(libForRows), [libForRows])
  const specsSig = specsSignature(specs)
  const [candidates, setCandidates] = React.useState<Record<string, Candidate[]>>({})
  const [rowsLoading, setRowsLoading] = React.useState(false)
  const [rowsTimedOut, setRowsTimedOut] = React.useState(false)
  const [rowsFailed, setRowsFailed] = React.useState(false)
  const [rowsRetry, setRowsRetry] = React.useState(0)
  const rowsOwnerRef = React.useRef("")
  const rowsCacheKey = discoverUser?.id ? `booklog.discover.rows:${discoverUser.id}` : ""
  React.useEffect(() => {
    if (rowsOwnerRef.current !== rowsCacheKey) {
      rowsOwnerRef.current = rowsCacheKey
      setCandidates({}); setRowsLoading(false); setRowsTimedOut(false); setRowsFailed(false)
    }
    if (!rowsCacheKey) return
    if (specs.length === 0) { setCandidates({}); setRowsLoading(false); setRowsFailed(false); return }
    try {
      const saved = JSON.parse(localStorage.getItem(rowsCacheKey) || "null")
      // Cached rows are good for 3 days; the library signature still refreshes them on any shelf change.
      // A partial fetch (some specs came back empty, e.g. a Google Books outage) expires after 1 hour instead.
      const ttl = saved && saved.partial ? 3600 * 1000 : 3 * 24 * 3600 * 1000
      // Restore stale same-user candidates too, but always filter them against the current library/specs.
      if (saved?.candidates) setCandidates(saved.candidates)
      if (!rowsRetry && saved && saved.sig === specsSig && Date.now() - saved.savedAt < ttl && saved.candidates) { setRowsLoading(false); setRowsFailed(!!saved.partial); return }
    } catch {}
    let cancelled = false
    setRowsLoading(true); setRowsTimedOut(false); setRowsFailed(false)
    // A slow request is still loading, not an empty result or a failure.
    const limit = setTimeout(() => { if (!cancelled) setRowsTimedOut(true) }, 10000)
    const t = setTimeout(async () => {
      try {
        // Fetch only the first 6 non-rated specs: 3 visible rows (MAX_ROWS) plus headroom for rows that hide. Raise this slice if MAX_ROWS grows past 3.
        const free = fetchDiscoverCandidates(specs.filter(s => s.kind !== "rated").slice(0, 6), (key, list) => { if (!cancelled && list.length >= 4) setCandidates(prev => ({ ...prev, [key]: list })) })
        const spirit = createClientSupabaseClient().auth.getSession().then(({data}) => getFreeSpiritCandidates(data.session?.access_token || "", specs.filter(s => s.kind === "rated")).then(c => ({ c, failed: false }))).catch(() => ({ c: {} as Record<string, Candidate[]>, failed: true }))
        const [freeRes, spiritRes] = await Promise.all([free, spirit])
        const got = { ...freeRes.candidates, ...spiritRes.c }
        if (cancelled) return
        const partial = freeRes.failed.length > 0 || spiritRes.failed
        const failedKeys = [...freeRes.failed, ...(spiritRes.failed ? specs.filter(s => s.kind === "rated").map(s => s.key) : [])]
        setRowsFailed(partial)
        setCandidates(prev => mergeRefreshCandidates(specs.map(s => s.key), prev, got, failedKeys))
        // Only complete successful refreshes replace the working cache. Failed/partial
        // refreshes keep the last usable cache for a later visit or retry.
        if (!partial) { try { localStorage.setItem(rowsCacheKey, JSON.stringify({ sig: specsSig, savedAt: Date.now(), partial, candidates: got })) } catch {} }
      } catch { if (!cancelled) setRowsFailed(true) }
      finally { if (!cancelled) { setRowsLoading(false); clearTimeout(limit) } }
    }, 400)
    return () => { cancelled = true; clearTimeout(t); clearTimeout(limit) }
  }, [rowsCacheKey, specsSig, rowsRetry])

  const aiKeys = (recommendations || []).map(r => bookKey(r.title, r.author))
  const builtRows = React.useMemo(() => assembleRows(specs, candidates, libForRows, dismissed, aiKeys), [specs, candidates, libForRows, dismissed, recommendations])
  const { pick: topPick, rows: shownRows } = desktop ? { pick: null, rows: builtRows } : takeTopPick(builtRows)
  const openCandidate = (c: { id: string; title: string; author: string; cover?: string; description?: string; publishedYear?: number; genre?: string }, reason?: string) => {
    const match = findInLibrary(c.id, c.title, c.author)
    setSelectedBook(match ? { ...(c as any), ...match } : (c as any))
    setSelectedBookInLibrary(!!match)
    setSelectedReason(match ? undefined : reason)
    setDialogOpen(true)
  }

  const statusLabel: Record<string, string> = {
    reading:     "Reading",
    queued:      "Queued",
    completed:   "Completed",
    recommended: "Recommendations",
    onHold:      "On Hold",
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const results = await getAIBookRecommendations(prompt, [], 8)
      setRecommendations(results)
      saveDiscover(prompt, results)
    } catch (err) {
      setError("Sorry, we couldn't generate recommendations. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleShowMore = async () => {
    if (!prompt.trim() || !recommendations || isLoadingMore) return
    setIsLoadingMore(true)
    setError(null)
    try {
      const seen = recommendations.map(r => `${r.title} by ${r.author}`)
      const more = await getAIBookRecommendations(prompt, [...seen, ...dismissed.slice(-40).map(d => d.key.split("|")[0])], 8)
      const have = new Set(recommendations.map(r => `${r.title}|${r.author}`.toLowerCase()))
      const fresh = more.filter((r: BookSearchResult) => !have.has(`${r.title}|${r.author}`.toLowerCase()))
      const merged = [...recommendations, ...fresh]
      setRecommendations(merged)
      saveDiscover(prompt, merged)
    } catch (err) {
      setError("Sorry, we couldn't load more recommendations. Please try again.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleClearHistory = () => {
    setRecommendations(null)
    saveDiscover(prompt, null)
  }

  const submitBtn = (label: string) => (
    <button type="submit" disabled={isLoading}
      style={{ padding: "7px 16px", background: isLoading ? "var(--bl-d4a574)" : "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: "500", cursor: isLoading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>
      {isLoading ? "Generating..." : label}
    </button>
  )
  const linkBtn: React.CSSProperties = { fontSize: 11, color: "var(--bl-8a7560)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "'DM Sans', sans-serif" }
  const aiBooks = (recommendations || []).map(r => ({ id: r.id, title: r.title, author: r.author, cover: r.cover, badge: findInLibrary(r.id, r.title, r.author) ? "In library" : undefined }))
  const hasAnything = !!recommendations || shownRows.length > 0 || !!topPick
  const rowStatus = refreshStatus(rowsLoading, rowsTimedOut, rowsFailed)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {desktop ? (
        <div style={{ background: "var(--bl-fff)", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "10px", padding: "1.25rem" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "15px", color: "var(--bl-1a1208)", fontWeight: "normal", marginBottom: "0.75rem" }}>Tell us what you like</h2>
          <form onSubmit={handleSubmit}>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="I enjoy literary fiction with strong character development..."
              style={{ width: "100%", minHeight: "70px", maxHeight: "70px", fontSize: "13px", border: "0.5px solid var(--bl-d4c5a9)", borderRadius: "7px", background: "var(--bl-faf7f2)", color: "var(--bl-1a1208)", resize: "none", marginBottom: "0.625rem" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>{submitBtn("Get Recommendations")}</div>
          </form>
        </div>
      ) : (
        <form onSubmit={handleSubmit} data-testid="ai-bar" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bl-fff)", border: "0.5px solid var(--bl-d4c5a9)", borderRadius: 24, padding: "6px 6px 6px 14px" }}>
          <span style={{ color: "var(--bl-c17f3e)" }}>✦</span>
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask for something specific..." style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--bl-1a1208)", fontFamily: "'DM Sans', sans-serif" }} />
          {submitBtn("Ask AI")}
        </form>
      )}

      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "1rem 0" }}>
          <div style={{ width: "22px", height: "22px", border: "2.5px solid var(--bl-e0d5c4)", borderTopColor: "var(--bl-c17f3e)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: "13px", color: "var(--bl-8a7560)" }}>Analysing your preferences...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {error && !isLoading && (
        <div style={{ background: "var(--bl-fdf2f2)", border: "0.5px solid var(--bl-e8c4c4)", borderRadius: "10px", padding: "1.25rem", marginTop: 14 }}>
          <p style={{ fontSize: "13px", color: "var(--bl-a04040)" }}>{error}</p>
        </div>
      )}

      {!isLoading && !error && recommendations && recommendations.length === 0 && (
        <div role="status" style={{ background: "var(--bl-f5f0e8)", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "10px", padding: "1.25rem", marginTop: 14 }}>
          <p style={{ fontSize: "13px", color: "var(--bl-8a7560)" }}>No matches found for this request. Try a different description of what you want to read.</p>
        </div>
      )}

      {!isLoading && recommendations && recommendations.length > 0 && (
        <DiscoverRowView
          rowKey="ai" title="From your AI request" subtitle={`"${prompt.trim().slice(0, 80)}${prompt.trim().length > 80 ? "..." : ""}"`}
          books={aiBooks} mobile={!desktop}
          onOpen={(b) => { const r = recommendations.find(x => x.id === b.id && x.title === b.title); if (r) openCandidate(r, prompt.trim() ? `It matches what you asked for: "${prompt.trim().slice(0, 120)}".` : undefined) }}
          onDismiss={(b) => {
            dismissBook(b.title, b.author)
            const next = recommendations.filter(x => !(x.id === b.id && x.title === b.title))
            setRecommendations(next.length ? next : null); saveDiscover(prompt, next.length ? next : null)
          }}
          actions={<>
            <button type="button" style={linkBtn} onClick={handleShowMore} disabled={isLoadingMore}>{isLoadingMore ? "Finding more..." : "Show me more"}</button>
            <button type="button" style={linkBtn} onClick={handleClearHistory}>Clear</button>
          </>}
        />
      )}

      {topPick && (
        <TopPickCard book={topPick} reason={topPick.reason}
          onOpen={() => openCandidate(topPick, topPick.reason)}
          onDismiss={() => dismissBook(topPick.title, topPick.author)} />
      )}

      {shownRows.map(r => (
        <DiscoverRowView key={r.key} rowKey={r.key} title={r.title} subtitle={r.subtitle} books={r.books} mobile={!desktop}
          onOpen={(b) => { const c = r.books.find(x => x.id === b.id && x.title === b.title); if (c) openCandidate(c, r.reason) }}
          onDismiss={(b) => dismissBook(b.title, b.author)} />
      ))}

      {rowsLoading && (
        <p style={{ fontSize: 12, color: "var(--bl-8a7560)", marginTop: 18, fontFamily: "'DM Sans', sans-serif" }} role="status">{rowStatus === "slow" ? (shownRows.length || topPick ? "Still loading suggestions. Your earlier picks stay here while we refresh." : "Still loading suggestions. The book sources are taking longer than usual.") : "Finding picks from your library..."}</p>
      )}
      {rowsFailed && !rowsLoading && (
        <div role="status" style={{ fontSize: 12, color: "var(--bl-8a7560)", marginTop: 18 }}>
          {shownRows.length || topPick ? "Some suggestions could not be refreshed. Your earlier picks are still shown. " : "Suggestions could not be loaded. Please try again. "}
          <button type="button" style={linkBtn} onClick={() => setRowsRetry(n => n + 1)}>Retry</button>
        </div>
      )}
      {!hasAnything && !isLoading && !rowsLoading && !rowsFailed && specs.length > 0 && (
        <div style={{ background: "var(--bl-f3ede3)", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "10px", padding: "1.25rem", marginTop: 14 }}>
          <p role="status" style={{ fontSize: "12px", color: "var(--bl-8a7560)", lineHeight: "1.65" }}>
            No library-based rows are ready to show. Describe what you enjoy in the Ask AI box above for recommendations.
          </p>
        </div>
      )}
      {!hasAnything && !rowsLoading && !isLoading && specs.length === 0 && (
        <div style={{ background: "var(--bl-f3ede3)", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "10px", padding: "1.25rem", marginTop: 14 }}>
          <p style={{ fontSize: "12px", color: "var(--bl-8a7560)", lineHeight: "1.65" }}>
            Describe what you enjoy above for AI recommendations. Picks based on your library show up here as you read more books by the same author, rate favourites 5 stars, and build up a favourite genre.
          </p>
        </div>
      )}
      <BookDetailsDialog book={selectedBook} open={dialogOpen} onClose={() => setDialogOpen(false)} mode={selectedBookInLibrary ? "view" : "add"} reason={selectedReason} />
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
    background: selected === g ? "var(--bl-f5ede0)" : "transparent",
    color: selected === g ? "var(--bl-8a5a1e)" : "var(--bl-8a7560)",
    border: selected === g ? "1px solid var(--bl-c17f3e)" : "0.5px solid var(--bl-d4c5a9)",
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
    background: "var(--bl-e8e0d5)",
    color: "var(--bl-5a4a38)",
    border: "0.5px solid var(--bl-c8b89a)",
    flexShrink: 0,
  }
  return (
    <>
      {/* Desktop: wrap + More */}
      <div className="hidden md:flex flex-wrap gap-2 items-center" style={{ borderTop: "0.5px solid var(--bl-e0d5c4)", paddingTop: "10px", marginBottom: "12px" }}>
        <span title="Genres come from the books in your library" style={{ fontSize: "11px", color: "var(--bl-8a7560)", fontFamily: "'DM Sans', sans-serif", marginRight: "2px" }}>Genre:</span>
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
      <div className="md:hidden flex gap-2 overflow-x-auto pb-1 items-center" style={{ borderTop: "0.5px solid var(--bl-e0d5c4)", paddingTop: "10px", marginBottom: "12px", scrollbarWidth: "none" }}>
        <span style={{ fontSize: "11px", color: "var(--bl-8a7560)", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}>Genre:</span>
        {genres.map(g => (
          <span key={g} style={pillStyle(g)} onClick={() => onSelect(g)}>{g}</span>
        ))}
      </div>
    </>
  )
}

function BooksLibraryContent() {
  const [activeTab, setActiveTab]   = useState("Reading")
  const [sidebarTab, setSidebarTab] = useState("my-books")
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number | "all">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("booklog-page-size")
      if (saved === "all") return "all"
      const n = parseInt(saved || "")
      if (!isNaN(n)) return n
    }
    return 10
  })
  const [listSearch, setListSearch] = useState("")
  const [myBooksGenreFilter, setMyBooksGenreFilter]               = useState<string>("All")
  const [recommendedGenreFilter, setRecommendedGenreFilter]       = useState<string>("All")
  const [myBooksGenreExpanded, setMyBooksGenreExpanded]           = useState(false)
  const [recommendedGenreExpanded, setRecommendedGenreExpanded]   = useState(false)

  useEffect(() => {
    const savedTab = localStorage.getItem("booklog-active-tab")
    if (savedTab) { setActiveTab(savedTab); localStorage.removeItem("booklog-active-tab") }
    const savedView = localStorage.getItem("booklog-view-mode")
    if (savedView === "list" || savedView === "grid") setViewMode(savedView)
    const section = new URLSearchParams(window.location.search).get("section")
    if (section === "discover" || section === "recommended") setSidebarTab(section)
    prefetchAmazonDomain()
  }, [])

  const { getBooksByStatus, getBookCountByStatus, removeBook, books, loadError, reloadBooks, loading } = useBooks()
  const libraryEmpty = showFirstBookPrompt({ loading, loadError, bookCount: Object.values(books).flat().length })
  const searchParams = useSearchParams()
  const requestedBookId = searchParams.get("book")
  const [linkedBookId, setLinkedBookId] = useState<string | null>(null)
  useEffect(() => {
    setLinkedBookId(requestedBookId)
  }, [requestedBookId])
  const linkedBook = linkedBookId ? Object.values(books).flat().find(b => b.id === linkedBookId) : null


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
    const byGenre = genreFilter === "All" ? raw : raw.filter(b => b.genre === genreFilter)
    const q = listSearch.trim().toLowerCase()
    setFilteredBooks(q ? byGenre.filter(b => `${b.title} ${b.author}`.toLowerCase().includes(q)) : byGenre)
    setCurrentPage(1)
  }, [activeTab, sidebarTab, getBooksByStatus, myBooksGenreFilter, recommendedGenreFilter, listSearch])

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
      <button onClick={() => toggleView("grid")} className={`p-2 rounded ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted"}`} title="Grid view"><LayoutGrid size={15} /></button>
      <button onClick={() => toggleView("list")} className={`p-2 rounded ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted"}`} title="List view"><List size={15} /></button>
    </div>
  )

  const paginatedBooks = pageSize === "all"
    ? filteredBooks
    : filteredBooks.slice((currentPage - 1) * (pageSize as number), currentPage * (pageSize as number))

  const totalPages = pageSize === "all" ? 1 : Math.ceil(filteredBooks.length / (pageSize as number))

  const handlePageSizeChange = (val: string) => {
    const next = val === "all" ? "all" : parseInt(val)
    setPageSize(next)
    setCurrentPage(1)
    localStorage.setItem("booklog-page-size", val)
  }

  const PaginationBar = () => {
    if (filteredBooks.length === 0) return null
    const start = pageSize === "all" ? 1 : (currentPage - 1) * (pageSize as number) + 1
    const end   = pageSize === "all" ? filteredBooks.length : Math.min(currentPage * (pageSize as number), filteredBooks.length)
    const showPages = totalPages > 1

    const pageButtons = () => {
      if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
      if (currentPage <= 3) return [1, 2, 3, null, totalPages]
      if (currentPage >= totalPages - 2) return [1, null, totalPages - 2, totalPages - 1, totalPages]
      return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages]
    }

    const btnBase: React.CSSProperties = {
      width: "28px", height: "28px", borderRadius: "6px",
      border: "0.5px solid var(--bl-e0d5c4)", background: "transparent",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", fontSize: "11px", fontFamily: "'DM Sans', sans-serif",
      color: "var(--bl-6b5c42)",
    }
    const btnActive: React.CSSProperties = { ...btnBase, background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "0.5px solid var(--bl-c17f3e)", fontWeight: 600 }
    const btnDisabled: React.CSSProperties = { ...btnBase, opacity: 0.35, cursor: "default" }

    const sizeSelector = (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "11px", color: "var(--bl-8a7560)", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>Per page</span>
        <select
          value={pageSize === "all" ? "all" : String(pageSize)}
          onChange={e => handlePageSizeChange(e.target.value)}
          style={{
            fontSize: "11px", fontFamily: "'DM Sans', sans-serif",
            border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "6px",
            padding: "3px 20px 3px 7px", background: "var(--bl-faf7f2)",
            color: "var(--bl-1a1208)", cursor: "pointer", appearance: "none",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238a7560'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center",
          }}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="all">All</option>
        </select>
      </div>
    )

    return (
      <div style={{ borderTop: "0.5px solid var(--bl-e0d5c4)", marginTop: "16px", paddingTop: "12px" }}>
        {/* Mobile: info + selector row, then page buttons centered */}
        <div className="md:hidden">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "var(--bl-8a7560)", fontFamily: "'DM Sans', sans-serif" }}>{start}–{end} of {filteredBooks.length}</span>
            {sizeSelector}
          </div>
          {showPages && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              <button style={currentPage === 1 ? btnDisabled : btnBase} onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}>‹</button>
              {pageButtons().map((p, i) =>
                p === null
                  ? <span key={"e"+i} style={{ fontSize: "11px", color: "var(--bl-8a7560)", padding: "0 2px" }}>…</span>
                  : <button key={p} style={p === currentPage ? btnActive : btnBase} onClick={() => setCurrentPage(p)}>{p}</button>
              )}
              <button style={currentPage === totalPages ? btnDisabled : btnBase} onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}>›</button>
            </div>
          )}
        </div>
        {/* Desktop: single row */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "var(--bl-8a7560)", fontFamily: "'DM Sans', sans-serif", flex: 1 }}>Showing {start}–{end} of {filteredBooks.length}</span>
          {showPages && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button style={currentPage === 1 ? btnDisabled : btnBase} onClick={() => currentPage > 1 && setCurrentPage(p => p - 1)}>‹</button>
              {pageButtons().map((p, i) =>
                p === null
                  ? <span key={"e"+i} style={{ fontSize: "11px", color: "var(--bl-8a7560)", padding: "0 2px" }}>…</span>
                  : <button key={p} style={p === currentPage ? btnActive : btnBase} onClick={() => setCurrentPage(p)}>{p}</button>
              )}
              <button style={currentPage === totalPages ? btnDisabled : btnBase} onClick={() => currentPage < totalPages && setCurrentPage(p => p + 1)}>›</button>
            </div>
          )}
          {sizeSelector}
        </div>
      </div>
    )
  }

  const firstBookPrompt = (span: boolean) => (
    <div className={span ? "col-span-full text-center py-12" : "text-center py-12"} style={sans}>
      <p style={{ fontSize: "15px", color: "var(--bl-1a1208)", fontWeight: 600 }}>Your shelf is empty</p>
      <p style={{ fontSize: "13px", color: "var(--bl-6b5c42)", margin: "6px auto 14px", maxWidth: "320px" }}>
        Add your first book - search by title or author above, or scan its barcode.
      </p>
      <button
        type="button"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" })
          setTimeout(() => document.querySelector<HTMLInputElement>('input[placeholder="Search books or authors"]')?.focus(), 300)
        }}
        style={{ fontSize: "13px", background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "none", borderRadius: "8px", padding: "9px 20px", fontWeight: 600, cursor: "pointer" }}
      >
        Add your first book
      </button>
      <p style={{ fontSize: "13px", color: "var(--bl-6b5c42)", marginTop: "14px" }}>
        Not sure what to read yet?{" "}
        <Link
          href="/books?section=discover"
          onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; e.preventDefault(); handleSidebarTab("discover") }}
          style={{ color: "var(--bl-c17f3e)", textDecoration: "underline", textUnderlineOffset: "2px", fontWeight: 500 }}
        >
          Browse Discover
        </Link>{" "}
        - ideas picked for you.
      </p>
    </div>
  )

  const gridView = (books: Book[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
      {books.map((book) => <BookCard key={book.id} book={book} removeBook={removeBook} />)}
      {books.length === 0 && (libraryEmpty ? firstBookPrompt(true) : <div className="col-span-full text-gray-400 text-center py-12" style={sans}>No books here yet.</div>)}
    </div>
  )

  const listView = (books: Book[]) => (
    <div className="flex flex-col gap-2 mt-4">
      {books.map((book) => <BookListRow key={book.id} book={book} removeBook={removeBook} />)}
      {books.length === 0 && (libraryEmpty ? firstBookPrompt(false) : <div className="text-gray-400 text-center py-12" style={sans}>No books here yet.</div>)}
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bl-faf7f2)" }}>
      {linkedBook && <BookDetailsDialog book={linkedBook} open={true} onClose={() => {setLinkedBookId(null); window.history.replaceState(null, "", "/books")}} mode="view" />}
      <Sidebar activeTab={sidebarTab} onTabChange={handleSidebarTab} />

      <main className="flex-1 overflow-auto pb-20 md:pb-0" style={{ background: "var(--bl-f7f4ef)" }}>
        <div className="px-8 py-8 w-full">
          {loadError && (
            <div role="alert" className="mb-4 rounded-lg border px-4 py-3 text-sm" style={{ background: "var(--bl-fdf3e7)", borderColor: "var(--bl-e8c9a0)", color: "var(--bl-6b4a1f)" }}>
              We could not load your library just now. Your books are safe. <button type="button" onClick={reloadBooks} className="underline font-medium">Try again</button>
            </div>
          )}

          {/* Page title + share button */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold" style={{ ...serif, color: "var(--bl-2d2416)" }}>
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
                border: "0.5px solid var(--bl-c17f3e)",
                borderRadius: "7px",
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--bl-c17f3e)",
                fontWeight: "600",
                fontFamily: "'DM Sans', sans-serif",
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--bl-c17f3e)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
              <StarterBooksLine />
              <div className="flex items-center justify-between mb-3">
                <ul className="flex gap-2 overflow-x-auto md:flex-wrap" style={{ scrollbarWidth: "none", flexShrink: 1, minWidth: 0 }}>
                  {tabs.map((tab) => (
                    <li
                      key={tab.name}
                      onClick={() => setActiveTab(tab.name)}
                      className="cursor-pointer px-4 py-2 rounded-full text-sm transition-colors flex-shrink-0"
                      style={{
                        ...sans,
                        background: activeTab === tab.name ? "var(--bl-c17f3e)" : "var(--bl-ede6dc)",
                        color:      activeTab === tab.name ? "var(--bl-primary-ink)" : "var(--bl-6b5c4e)",
                        fontWeight: activeTab === tab.name ? "600"     : "500",
                      }}
                    >
                      {tab.name} ({tab.count})
                    </li>
                  ))}
                </ul>
                {viewToggle}
              </div>
              <div className="mb-3">
                <input
                  type="search"
                  value={listSearch}
                  onChange={e => setListSearch(e.target.value)}
                  placeholder="Filter this list by title or author..."
                  aria-label="Filter this list by title or author"
                  style={{ width: "100%", maxWidth: "360px", padding: "7px 12px", fontSize: "12px", border: "0.5px solid var(--bl-d4c5a9)", borderRadius: "7px", background: "var(--bl-fff)", color: "var(--bl-1a1208)", fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <GenreFilterRow
                selected={myBooksGenreFilter}
                onSelect={setMyBooksGenreFilter}
                expanded={myBooksGenreExpanded}
                onToggleExpand={() => setMyBooksGenreExpanded(e => !e)}
                genres={userGenres}
              />
              {viewMode === "grid" ? gridView(paginatedBooks) : listView(paginatedBooks)}
              <PaginationBar />
            </>
          )}

          {/* MY RECOMMENDATIONS */}
          {sidebarTab === "recommended" && (
            <>
              <div className="mb-5">
                <BookSearch />
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-4 py-2 rounded-full text-sm" style={{ ...sans, background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", fontWeight: "600" }}>
                  My Recommendations ({recommendedCount})
                </span>
                {viewToggle}
              </div>
              <div className="mb-3">
                <input
                  type="search"
                  value={listSearch}
                  onChange={e => setListSearch(e.target.value)}
                  placeholder="Filter this list by title or author..."
                  aria-label="Filter this list by title or author"
                  style={{ width: "100%", maxWidth: "360px", padding: "7px 12px", fontSize: "12px", border: "0.5px solid var(--bl-d4c5a9)", borderRadius: "7px", background: "var(--bl-fff)", color: "var(--bl-1a1208)", fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <GenreFilterRow
                selected={recommendedGenreFilter}
                onSelect={setRecommendedGenreFilter}
                expanded={recommendedGenreExpanded}
                onToggleExpand={() => setRecommendedGenreExpanded(e => !e)}
                genres={userGenres}
              />
              {viewMode === "grid" ? gridView(paginatedBooks) : listView(paginatedBooks)}
              <PaginationBar />
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

function BooksLibrary() {
  return <React.Suspense fallback={<main className="container px-4 py-8">Loading your library...</main>}><BooksLibraryContent /></React.Suspense>
}

export default function BooksPage() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <main className="container px-4 py-8">Loading your library...</main>
  if (!user) return (
    <main className="container px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Log in to view your library</h1>
      <p className="mb-4">Your books are saved. Log in to see them.</p>
      <a href="/login" className="text-blue-600 underline">Log in</a>
    </main>
  )
  return <BooksLibrary />
    }
