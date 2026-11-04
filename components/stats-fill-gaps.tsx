"use client"

// Fill in the gaps: lists finished books that have no finish date or no rating, and lets the reader fill
// those blanks with the app's existing save functions. The only part of Stats that writes anything.
// Fill-only: rows come from the missing lists taken when the view opens, so a book that already had a
// date or rating is never offered. Start dates are never asked for or changed.
import React from "react"
import { useBooks } from "@/lib/book-context"
import { readingStats, STATS_MIN_DATED, type GapBook } from "@/lib/reading-stats"
import { isValidDate, todayLocal, formatReadingDate, type DatePrecision } from "@/lib/reading-dates"
import { MonthDayPicker, type PickedDate } from "@/components/month-day-picker"
import { serif, sans, card, muted, nudge, heading, primaryButton, linkButton, plural, Progress, Toggle } from "@/components/stats-ui"

export type GapFilter = "dates" | "ratings"
const PAGE = 20

function Stars({ value, disabled, onPick, title }: { value: number; disabled: boolean; onPick: (n: number) => void; title: string }) {
  return (
    <div role="group" aria-label={`Your rating for ${title}`} style={{ display: "flex" }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" disabled={disabled} aria-label={`Rate ${n} of 5`} aria-pressed={value === n} onClick={() => onPick(n)}
          style={{ width: "36px", height: "44px", border: "none", background: "transparent", cursor: disabled ? "default" : "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill={n <= value ? "var(--bl-c17f3e)" : "none"} stroke="var(--bl-c17f3e)" strokeWidth="1.4" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export function StatsFillGaps({ initialFilter, onBack }: { initialFilter: GapFilter; onBack: () => void }) {
  const { books, saveDates, updateRating } = useBooks()
  const live = React.useMemo(() => readingStats(books), [books])
  // Taken once when the view opens: saved rows stay in place for this visit instead of jumping away.
  const [lists] = React.useState(() => ({ dates: live.missingDates, ratings: live.missingRatings }))
  const [filter, setFilter] = React.useState<GapFilter>(initialFilter)
  const [shown, setShown] = React.useState(PAGE)
  const [picked, setPicked] = React.useState<Record<string, PickedDate>>({})
  const [busy, setBusy] = React.useState<Record<string, boolean>>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const current = React.useMemo(() => {
    const byId = new Map<string, { finishedAt?: string; finishedPrecision?: DatePrecision; selfRating?: number }>()
    for (const b of [...(books.completed || []), ...(books.recommended || [])]) {
      const seen = byId.get(b.id)
      byId.set(b.id, {
        finishedAt: seen?.finishedAt && isValidDate(seen.finishedAt) ? seen.finishedAt : b.finishedAt,
        finishedPrecision: seen?.finishedAt && isValidDate(seen.finishedAt) ? seen.finishedPrecision : b.finishedPrecision,
        selfRating: Math.max(seen?.selfRating || 0, b.selfRating || 0),
      })
    }
    return byId
  }, [books])

  const rows = lists[filter]
  const today = todayLocal()
  const remainingDates = lists.dates.filter(b => !isValidDate(current.get(b.id)?.finishedAt)).length
  const remainingRatings = lists.ratings.filter(b => !(current.get(b.id)?.selfRating)).length

  const run = async (b: GapBook, task: () => Promise<void>) => {
    setBusy(x => ({ ...x, [b.id]: true }))
    setErrors(x => ({ ...x, [b.id]: "" }))
    try { await task() }
    catch { setErrors(x => ({ ...x, [b.id]: "Not saved. Try again." })) }
    finally { setBusy(x => ({ ...x, [b.id]: false })) }
  }
  const saveDate = (b: GapBook) => {
    const p = picked[b.id]
    if (!p || !isValidDate(p.value)) return
    return run(b, () => saveDates(b.id, { finishedAt: p.value, finishedPrecision: p.precision }))
  }
  const rate = (b: GapBook, n: number) => run(b, () => updateRating(b.id, n))

  const isFuture = (p?: PickedDate) => !!p && isValidDate(p.value) && (p.precision === "month" ? p.value.slice(0, 7) > today.slice(0, 7) : p.value > today)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "960px" }}>
      <button type="button" onClick={onBack} style={{ ...linkButton, alignSelf: "flex-start" }}>← Back to stats</button>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <h2 style={{ ...heading, fontSize: "22px" }}>Fill in the gaps</h2>
        <p style={{ ...sans, ...muted, fontSize: "14px", margin: 0 }}>Add when you finished a book and how you rated it. Skip anything you don’t remember.</p>
      </div>

      {filter === "dates" && (live.dated < STATS_MIN_DATED
        ? <div style={{ ...nudge, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
            <Progress done={live.dated} of={STATS_MIN_DATED} label={`${live.dated} of ${STATS_MIN_DATED} finished books have dates`} />
            <span style={{ ...sans, fontSize: "14px", color: "var(--bl-5a4a38)" }}>{plural(STATS_MIN_DATED - live.dated, "more", "more")} to see your reading by month</span>
          </div>
        : <div role="status" style={{ ...card, background: "var(--bl-f3ede3)", padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ ...sans, fontSize: "15px", fontWeight: 600, color: "var(--bl-2d2416)" }}>Your reading by month and year is ready.</span>
            <button type="button" onClick={onBack} style={primaryButton}>See your stats</button>
          </div>)}

      <Toggle label="Show" value={filter} onChange={f => { setFilter(f); setShown(PAGE) }}
        options={[{ value: "dates", label: `Missing dates · ${remainingDates}` }, { value: "ratings", label: `Missing ratings · ${remainingRatings}` }]} />

      <section style={{ ...card, padding: "4px 20px" }}>
        {rows.length === 0 && <p style={{ ...sans, ...muted, fontSize: "14px", padding: "14px 0", margin: 0 }}>Nothing missing here.</p>}
        {rows.slice(0, shown).map(b => {
          const now = current.get(b.id)
          const p = picked[b.id]
          const future = isFuture(p)
          return (
            <div key={b.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 16px", padding: "14px 0", borderBottom: "1px solid var(--bl-f0e8da)" }}>
              <div style={{ flex: "1 1 220px", minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
                <span style={{ ...serif, fontSize: "15px", fontWeight: 700, color: "var(--bl-2d2416)", overflowWrap: "anywhere" }}>{b.title}</span>
                <span style={{ ...sans, ...muted, fontSize: "13px" }}>{[b.author, b.shelf].filter(Boolean).join(" · ")}</span>
              </div>
              {filter === "dates" ? (
                isValidDate(now?.finishedAt)
                  ? <span role="status" style={{ ...sans, fontSize: "14px", color: "var(--bl-2d2416)" }}>Saved · Finished {formatReadingDate(now!.finishedAt as string, now?.finishedPrecision || "day")}</span>
                  : <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "10px" }}>
                      <MonthDayPicker label="Finished" value={p?.value || ""} precision={p?.precision || "month"} disabled={!!busy[b.id]}
                        onChange={next => setPicked(x => ({ ...x, [b.id]: next }))} />
                      <button type="button" onClick={() => saveDate(b)} disabled={!!busy[b.id] || !p || !isValidDate(p.value) || future}
                        style={{ ...primaryButton, opacity: !p || !isValidDate(p.value) || future ? 0.5 : 1 }}>{busy[b.id] ? "Saving…" : "Save"}</button>
                      {future && <span style={{ ...sans, fontSize: "13px", color: "var(--bl-a04040)" }}>That’s in the future.</span>}
                    </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Stars value={now?.selfRating || 0} disabled={!!busy[b.id]} onPick={n => rate(b, n)} title={b.title} />
                  {!!now?.selfRating && <span role="status" style={{ ...sans, ...muted, fontSize: "13px" }}>Saved</span>}
                </div>
              )}
              {errors[b.id] && <span role="alert" style={{ ...sans, fontSize: "13px", color: "var(--bl-a04040)", flexBasis: "100%" }}>{errors[b.id]}</span>}
            </div>
          )
        })}
        {rows.length > shown && (
          <div style={{ padding: "12px 0" }}>
            <button type="button" onClick={() => setShown(n => n + PAGE)} style={linkButton}>Show more ({rows.length - shown} left)</button>
          </div>
        )}
      </section>
    </div>
  )
}
