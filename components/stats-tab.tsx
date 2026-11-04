"use client"

// Stats ("Your reading life"): read-only numbers from the books already loaded.
// It never changes a book. Fill in the gaps (its own file) is the only part of Stats that saves anything.
import React from "react"
import Link from "next/link"
import { useBooks } from "@/lib/book-context"
import { readingStats, monthCounts, STATS_MIN_DATED, STATS_MIN_FINISHED } from "@/lib/reading-stats"
import { StatsFillGaps, type GapFilter } from "@/components/stats-fill-gaps"
import { serif, sans, card, muted, nudge, heading, primaryButton, linkButton, plural, Progress, Toggle } from "@/components/stats-ui"
import { track } from "@/lib/usage"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ ...card, padding: "16px 18px", display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
      <div style={{ ...sans, ...muted, fontSize: "13px" }}>{label}</div>
      <div style={{ ...serif, fontSize: value.length > 12 ? "20px" : "28px", fontWeight: 700, lineHeight: 1.2, color: "var(--bl-2d2416)", overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div style={{ ...sans, ...muted, fontSize: "12px" }}>{sub}</div>}
    </div>
  )
}

function Bars({ bars, label }: { bars: { label: string; count: number; showLabel: boolean }[]; label: string }) {
  const max = Math.max(1, ...bars.map(b => b.count))
  const summary = bars.filter(b => b.count > 0).map(b => `${b.label}: ${b.count}`).join(", ") || "none yet"
  return (
    <div>
      <div role="img" aria-label={`${label}. ${summary}`} style={{ display: "flex", alignItems: "flex-end", gap: bars.length > 20 ? "3px" : "8px", height: "150px", borderBottom: "1px solid var(--bl-e0d5c4)" }}>
        {bars.map((b, i) => (
          <div key={i} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: "4px", height: "100%" }}>
            {b.count > 0 && bars.length <= 20 && <span style={{ ...sans, fontSize: "11px", color: "var(--bl-5a4a38)" }}>{b.count}</span>}
            <div style={{ width: "100%", maxWidth: "40px", height: b.count ? `${Math.max(4, Math.round((b.count / max) * 120))}px` : "2px", borderRadius: "5px 5px 2px 2px", background: b.count ? "var(--bl-c17f3e)" : "var(--bl-e0d5c4)" }} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" style={{ display: "flex", gap: bars.length > 20 ? "3px" : "8px", marginTop: "6px" }}>
        {bars.map((b, i) => (
          <span key={i} style={{ ...sans, ...muted, flex: "1 1 0", minWidth: 0, textAlign: "center", fontSize: "11px", whiteSpace: "nowrap", overflow: "visible" }}>{b.showLabel ? b.label : ""}</span>
        ))}
      </div>
    </div>
  )
}

export function StatsTab({ onOpenCompleted }: { onOpenCompleted: () => void }) {
  const { books, loading } = useBooks()
  const s = React.useMemo(() => readingStats(books), [books])
  const [gaps, setGaps] = React.useState<GapFilter | null>(null)
  const [range, setRange] = React.useState<"year" | "all">("year")

  if (loading) return <p style={{ ...sans, ...muted, fontSize: "14px" }}>Loading your stats…</p>
  const openGaps = (f: GapFilter, from: string) => { track("stats.fill_gaps_opened", { filter: f, from }); setGaps(f) }
  if (gaps) return <StatsFillGaps initialFilter={gaps} onBack={() => setGaps(null)} />

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
          <h2 style={heading}>Finish {plural(s.booksToFull, "more book", "more books")} to see your genres and authors</h2>
          <p style={{ ...sans, fontSize: "14px", margin: 0, color: "var(--bl-5a4a38)", lineHeight: 1.5 }}>
            Already tracked your reading somewhere else? Bring your history in and this page fills straight away.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
            <Link href="/settings#goodreads-import" onClick={() => track("stats.import_clicked")} style={primaryButton}>Import from Goodreads</Link>
            <button type="button" onClick={() => { track("stats.add_finished_clicked"); onOpenCompleted() }} style={linkButton}>Or add a finished book</button>
          </div>
        </section>
      </div>
    )
  }

  const topGenreMax = s.genres[0]?.count || 1
  const tileCount = 2 + (s.topGenre ? 1 : 0) + (s.averageRating !== null ? 1 : 0)
  const tileColumns = tileCount === 4 ? "lg:grid-cols-4" : tileCount === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
  const year = s.defaultYear
  const yearBars = year === null ? [] : monthCounts(books, year).map((count, i) => ({ label: MONTHS[i], count, showLabel: true }))
  const allBars = s.byYear.map((y, i) => ({
    label: String(y.year),
    count: y.count,
    showLabel: s.byYear.length <= 8 || i === 0 || i === s.byYear.length - 1 || y.year % 5 === 0,
  }))
  const undated = s.finished - s.dated

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "960px" }}>
      <p style={{ ...sans, ...muted, fontSize: "15px", margin: 0 }}>From the {s.finished} books you’ve finished.</p>

      <div className={`grid grid-cols-2 ${tileColumns} gap-3`}>
        <Tile label="Books finished" value={String(s.finished)} sub="all time" />
        {s.topGenre && <Tile label="Top genre" value={s.topGenre.name} sub={`${s.topGenre.count} of ${s.finished} books`} />}
        {ratingTile}
        <Tile label="Authors read" value={String(s.authorsRead)} sub={s.repeatAuthors ? `${s.repeatAuthors} read more than once` : undefined} />
      </div>

      {s.showDatesCard && (
        <section style={{ ...nudge, padding: "20px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: "1 1 320px" }}>
            <h2 style={heading}>See your reading by month and year</h2>
            <p style={{ ...sans, fontSize: "14px", margin: 0, color: "var(--bl-5a4a38)", lineHeight: 1.5 }}>
              Add when you finished {plural(s.datesNeeded, "more book", "more books")} to unlock it. A month and year is enough.
            </p>
            <Progress done={s.dated} of={STATS_MIN_DATED} label={`${s.dated} of ${STATS_MIN_DATED} finished books have dates`} />
          </div>
          <button type="button" onClick={() => openGaps("dates", "dates_card")} style={primaryButton}>Fill in the gaps</button>
        </section>
      )}

      {s.showCharts && year !== null && (
        <section style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={heading}>Your reading by month and year</h2>
            <Toggle label="Period" value={range} onChange={r => { track("stats.chart_range", { range: r }); setRange(r) }} options={[{ value: "year", label: String(year) }, { value: "all", label: "All time" }]} />
          </div>
          {range === "year"
            ? <Bars bars={yearBars} label={`Books finished each month in ${year}`} />
            : <Bars bars={allBars} label="Books finished each year" />}
          <p style={{ ...sans, ...muted, fontSize: "13px", margin: 0 }}>
            Counts {plural(s.dated, "book", "books")} with a finish date.
            {undated > 0 && <> {plural(undated, "finished book has", "finished books have")} no date yet. <button type="button" onClick={() => openGaps("dates", "chart")} style={{ ...linkButton, fontSize: "13px", minHeight: 0 }}>Fill in the gaps</button></>}
          </p>
        </section>
      )}

      {(s.genres.length > 0 || s.secondCard) && (
        <div className={`grid gap-3 ${s.genres.length > 0 && s.secondCard ? "md:grid-cols-2" : ""}`}>
          {s.genres.length > 0 && (
            <section style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h2 style={heading}>Top genres</h2>
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
              <h2 style={{ ...heading, marginBottom: s.secondCard.kind === "topRated" && s.secondCard.rotatingOf ? 0 : "8px" }}>
                {s.secondCard.kind === "authors" ? "Authors you returned to" : s.secondCard.title}
              </h2>
              {s.secondCard.kind === "topRated" && s.secondCard.rotatingOf && (
                <p style={{ ...sans, ...muted, fontSize: "12px", margin: "2px 0 8px" }}>{s.secondCard.items.length} of {s.secondCard.rotatingOf} · a different few each day</p>
              )}
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
          <button type="button" onClick={() => openGaps("ratings", "ratings_line")} style={{ ...linkButton, fontSize: "13px", minHeight: 0 }}>Rate them</button>
        </p>
      )}
    </div>
  )
}
