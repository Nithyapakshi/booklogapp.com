"use client"

// Stats ("Your reading life"): read-only numbers from the books already loaded.
// It never changes a book; its buttons only take the reader to existing screens.
import React from "react"
import Link from "next/link"
import { useBooks } from "@/lib/book-context"
import { readingStats, STATS_MIN_DATED, STATS_MIN_FINISHED } from "@/lib/reading-stats"

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
const sans = { fontFamily: "'DM Sans', sans-serif" }
const card: React.CSSProperties = { background: "var(--bl-fff)", border: "1px solid var(--bl-e0d5c4)", borderRadius: "14px" }
const muted: React.CSSProperties = { color: "var(--bl-6b5c42)" }
const nudge: React.CSSProperties = { background: "var(--bl-f3ede3)", border: "1px dashed var(--bl-d4c5a9)", borderRadius: "14px" }
const primaryButton: React.CSSProperties = { ...sans, fontSize: "14px", fontWeight: 600, background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "none", borderRadius: "999px", padding: "0 20px", minHeight: "44px", cursor: "pointer", display: "inline-flex", alignItems: "center", textDecoration: "none" }
const linkButton: React.CSSProperties = { ...sans, fontSize: "14px", fontWeight: 500, color: "var(--bl-c17f3e)", background: "none", border: "none", padding: 0, minHeight: "44px", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
      <div style={{ ...sans, ...muted, fontSize: "13px" }}>{label}</div>
      <div style={{ ...serif, fontSize: value.length > 12 ? "20px" : "28px", fontWeight: 700, lineHeight: 1.2, color: "var(--bl-2d2416)", overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div style={{ ...sans, ...muted, fontSize: "12px" }}>{sub}</div>}
    </div>
  )
}

function Progress({ done, of, label }: { done: number; of: number; label: string }) {
  return (
    <div role="img" aria-label={label} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} style={{ width: "36px", height: "9px", borderRadius: "999px", background: i < done ? "var(--bl-c17f3e)" : "var(--bl-fff)", border: "1px solid var(--bl-e0d5c4)" }} />
      ))}
      <span style={{ ...sans, ...muted, fontSize: "12px", marginLeft: "4px" }}>{Math.min(done, of)} of {of}</span>
    </div>
  )
}

export function StatsTab({ onOpenCompleted }: { onOpenCompleted: () => void }) {
  const { books, loading } = useBooks()
  const s = React.useMemo(() => readingStats(books), [books])

  if (loading) return <p style={{ ...sans, ...muted, fontSize: "14px" }}>Loading your stats…</p>

  const ratingSub = s.unrated === 0 ? `All ${s.finished} rated` : `${s.rated} rated · ${s.unrated} not yet rated`
  const ratingTile = s.averageRating !== null && <Tile label="Average rating" value={`${s.averageRating.toFixed(1)}★`} sub={ratingSub} />

  if (!s.full) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "720px" }}>
        <p style={{ ...sans, ...muted, fontSize: "15px", margin: 0 }}>From the books you’ve finished.</p>
        <div className="grid grid-cols-2 gap-3">
          <Tile label="Books finished" value={String(s.finished)} sub="all time" />
          {ratingTile}
        </div>
        <section style={{ ...nudge, padding: "20px", display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
          <Progress done={s.finished} of={STATS_MIN_FINISHED} label={`${s.finished} of ${STATS_MIN_FINISHED} finished books`} />
          <h2 style={{ ...serif, fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--bl-2d2416)" }}>
            Finish {plural(s.booksToFull, "more book", "more books")} to see your genres and authors
          </h2>
          <p style={{ ...sans, fontSize: "14px", margin: 0, color: "var(--bl-5a4a38)", lineHeight: 1.5 }}>
            Already tracked your reading somewhere else? Bring your history in and this page fills straight away.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
            <Link href="/settings#goodreads-import" style={primaryButton}>Import from Goodreads</Link>
            <button type="button" onClick={onOpenCompleted} style={linkButton}>Or add a finished book</button>
          </div>
        </section>
      </div>
    )
  }

  const topGenreMax = s.genres[0]?.count || 1
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "960px" }}>
      <p style={{ ...sans, ...muted, fontSize: "15px", margin: 0 }}>From the {s.finished} books you’ve finished.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Books finished" value={String(s.finished)} sub="all time" />
        {s.topGenre && <Tile label="Top genre" value={s.topGenre.name} sub={`${s.topGenre.count} of ${s.finished} books`} />}
        {ratingTile}
        <Tile label="Authors read" value={String(s.authorsRead)} sub={s.repeatAuthors ? `${s.repeatAuthors} read more than once` : undefined} />
      </div>

      {s.showDatesCard && (
        <section style={{ ...nudge, padding: "20px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: "1 1 320px" }}>
            <h2 style={{ ...serif, fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--bl-2d2416)" }}>See your reading by month and year</h2>
            <p style={{ ...sans, fontSize: "14px", margin: 0, color: "var(--bl-5a4a38)", lineHeight: 1.5 }}>
              Add when you finished {plural(s.datesNeeded, "more book", "more books")} to unlock it. A month and year is enough.
            </p>
            <Progress done={s.dated} of={STATS_MIN_DATED} label={`${s.dated} of ${STATS_MIN_DATED} finished books have dates`} />
          </div>
          <button type="button" onClick={onOpenCompleted} style={primaryButton}>Add dates</button>
        </section>
      )}

      {(s.genres.length > 0 || s.secondCard) && (
        <div className={`grid gap-3 ${s.genres.length > 0 && s.secondCard ? "md:grid-cols-2" : ""}`}>
          {s.genres.length > 0 && (
            <section style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h2 style={{ ...serif, fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--bl-2d2416)" }}>Top genres</h2>
              {s.genres.map(g => (
                <div key={g.name} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <div style={{ ...sans, fontSize: "14px", display: "flex", justifyContent: "space-between", gap: "12px", color: "var(--bl-2d2416)" }}>
                    <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{g.name}</span>
                    <span style={{ ...muted, whiteSpace: "nowrap" }}>{plural(g.count, "book", "books")}</span>
                  </div>
                  <div style={{ height: "8px", borderRadius: "999px", background: "var(--bl-f3ede3)" }}>
                    <div style={{ height: "8px", borderRadius: "999px", background: "var(--bl-c17f3e)", width: `${Math.max(4, Math.round((g.count / topGenreMax) * 100))}%` }} />
                  </div>
                </div>
              ))}
            </section>
          )}
          {s.secondCard && (
            <section style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", gap: "2px" }}>
              <h2 style={{ ...serif, fontSize: "18px", fontWeight: 700, margin: "0 0 8px", color: "var(--bl-2d2416)" }}>
                {s.secondCard.kind === "authors" ? "Authors you returned to" : "Your top-rated books"}
              </h2>
              {s.secondCard.kind === "authors"
                ? s.secondCard.items.map(a => (
                    <div key={a.name} style={{ ...sans, fontSize: "14px", display: "flex", justifyContent: "space-between", gap: "12px", padding: "9px 0", borderBottom: "1px solid var(--bl-f0e8da)", color: "var(--bl-2d2416)" }}>
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{a.name}</span>
                      <span style={{ ...muted, whiteSpace: "nowrap" }}>{plural(a.count, "book", "books")}</span>
                    </div>
                  ))
                : s.secondCard.items.map(b => (
                    <div key={b.title + b.author} style={{ ...sans, fontSize: "14px", display: "flex", justifyContent: "space-between", gap: "12px", padding: "9px 0", borderBottom: "1px solid var(--bl-f0e8da)", color: "var(--bl-2d2416)" }}>
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        <span style={{ ...serif, fontWeight: 700 }}>{b.title}</span>
                        {b.author && <span style={muted}> · {b.author}</span>}
                      </span>
                      <span style={{ ...muted, whiteSpace: "nowrap" }}>{b.rating}★</span>
                    </div>
                  ))}
            </section>
          )}
        </div>
      )}

      {s.showRatingsLine && (
        <p style={{ ...sans, ...muted, fontSize: "13px", margin: 0 }}>
          {plural(s.unrated, "finished book isn’t", "finished books aren’t")} rated, so {s.unrated === 1 ? "it’s" : "they’re"} not in your average.{" "}
          <button type="button" onClick={onOpenCompleted} style={{ ...linkButton, fontSize: "13px", minHeight: 0 }}>Rate them</button>
        </p>
      )}
    </div>
  )
}
