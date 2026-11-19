"use client"
// Reading progress check-in (Reading shelf only).
// - ReadingProgressProvider loads the reader's newest check-in per book and owns the two dialogs,
//   so cards only ask to open them (clicks inside a dialog never reach the card underneath).
// - ProgressLine is the card footer: bar + "37% · 239 left" + Update, or "Finished?" from 90%.
// If the progress table is missing or cannot be read, the whole feature stays hidden: nothing else changes.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { lookupOwnPageCount } from "@/app/actions/page-count"
import { track } from "@/lib/usage"
import type { Book } from "@/types"
import {
  checkInError, latestByBook, offerFinish, pagesLeft, percentOf, progressSummary,
  type ProgressEntry, type ProgressMode,
} from "@/lib/reading-progress"

type Ctx = {
  enabled: boolean
  latest: Map<string, ProgressEntry>
  openCheckIn: (book: Book, from: string) => void
  openFinishChoice: (book: Book) => void
}
const ProgressContext = createContext<Ctx | null>(null)
export const useReadingProgress = () => useContext(ProgressContext)

const amber = "var(--bl-c17f3e)"
const link = { color: amber, fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3 } as const
// Bottom sheet on phones, small centred dialog from tablet width up.
const sheet = "top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 max-w-none rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-5 pb-[max(20px,env(safe-area-inset-bottom))] md:top-[50%] md:bottom-auto md:left-[50%] md:right-auto md:translate-x-[-50%] md:translate-y-[-50%] md:max-w-sm md:rounded-lg md:border md:p-6"

type Row = { book_id: string; mode: ProgressMode; page: number | null; percent: number | string | null; total_pages: number | null; created_at: string }
const toEntry = (r: Row): ProgressEntry => ({
  bookId: r.book_id, mode: r.mode, createdAt: r.created_at,
  page: r.page ?? undefined, percent: r.percent === null ? undefined : Number(r.percent), totalPages: r.total_pages ?? undefined,
})

export function ReadingProgressProvider({ userId, readingBooks, onFinish, children }: {
  userId?: string
  readingBooks: Book[]
  onFinish: (book: Book) => Promise<void>
  children: React.ReactNode
}) {
  const [enabled, setEnabled] = useState(false)
  const [latest, setLatest] = useState<Map<string, ProgressEntry>>(new Map())
  const [checkIn, setCheckIn] = useState<Book | null>(null)
  const [choice, setChoice] = useState<Book | null>(null)
  const owner = useRef(userId)
  owner.current = userId
  const readingKey = readingBooks.map(b => b.id).sort().join("|")

  const load = useCallback(async () => {
    if (!userId) { setEnabled(false); setLatest(new Map()); return }
    try {
      const { data, error } = await createClientSupabaseClient().from("reading_progress")
        .select("book_id,mode,page,percent,total_pages,created_at").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(1000)
      if (owner.current !== userId) return
      if (error) { setEnabled(false); return }
      setLatest(latestByBook(((data || []) as Row[]).map(toEntry)))
      setEnabled(true)
    } catch { if (owner.current === userId) setEnabled(false) }
  }, [userId])
  // Reload when the Reading shelf changes: a finished book's check-ins are cleared by the database.
  useEffect(() => { void load() }, [load, readingKey])

  const save = useCallback(async (book: Book, entry: Omit<ProgressEntry, "bookId" | "createdAt">) => {
    const { data, error } = await createClientSupabaseClient().from("reading_progress")
      .insert({ book_id: book.id, mode: entry.mode, page: entry.page ?? null, percent: entry.percent ?? null, total_pages: entry.totalPages ?? null })
      .select("book_id,mode,page,percent,total_pages,created_at").single()
    if (error || !data) throw error || new Error("Progress was not saved")
    const saved = toEntry(data as Row)
    setLatest(prev => new Map(prev).set(saved.bookId, saved))
    return saved
  }, [])

  const value = useMemo<Ctx>(() => ({
    enabled, latest,
    openCheckIn: (book, from) => { track("progress.opened", { from, first: !latest.has(book.id) }, book.id); setChoice(null); setCheckIn(book) },
    openFinishChoice: (book) => { track("finish.opened", {}, book.id); setChoice(book) },
  }), [enabled, latest])

  return <ProgressContext.Provider value={value}>
    {children}
    {checkIn && <CheckInDialog key={checkIn.id} book={checkIn} last={latest.get(checkIn.id)} onSave={save} onClose={() => setCheckIn(null)} />}
    {choice && <FinishChoiceDialog key={choice.id} book={choice} entry={latest.get(choice.id)}
      onYes={async () => { track("finish.choice", { choice: "yes" }, choice.id); await onFinish(choice); setChoice(null) }}
      onNotYet={() => { track("finish.choice", { choice: "not_yet" }, choice.id); value.openCheckIn(choice, "finish_choice") }}
      onClose={() => setChoice(null)} />}
  </ProgressContext.Provider>
}

// Card footer on the Reading shelf. Two lines at most on every screen size.
export function ProgressLine({ book, compact }: { book: Book; compact?: boolean }) {
  const ctx = useReadingProgress()
  const entry = ctx?.latest.get(book.id)
  const finish = offerFinish(entry)
  const offered = useRef(false)
  useEffect(() => {
    if (finish && !offered.current) { offered.current = true; track("finish.offered", {}, book.id) }
  }, [finish, book.id])
  if (!ctx?.enabled || book.status !== "reading") return null
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  if (!entry) {
    return <div onClick={stop} className={compact ? "mt-1" : "mt-2"}>
      <button type="button" className="text-[11px] min-h-6" style={link} onClick={() => ctx.openCheckIn(book, "card")}>Where are you up to?</button>
    </div>
  }
  const pct = percentOf(entry)
  return <div onClick={stop} className={compact ? "mt-1" : "mt-2"} data-progress={pct ?? ""}>
    {pct !== null && <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--bl-ede6dc)" }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct}% read`}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: amber }} />
    </div>}
    <div className="flex items-baseline justify-between gap-2 mt-1 text-[11px] text-muted-foreground">
      <span className="truncate">{(() => { const [head, tail] = (progressSummary(entry) || "").split(" · "); return <><span className="font-semibold text-foreground">{head}</span>{tail ? ` · ${tail}` : ""}</> })()}</span>
      {finish
        ? <button type="button" className="shrink-0 min-h-6" style={link} onClick={() => ctx.openFinishChoice(book)}>Finished?</button>
        : <button type="button" className="shrink-0 min-h-6" style={link} onClick={() => ctx.openCheckIn(book, "card")}>Update</button>}
    </div>
  </div>
}

function CheckInDialog({ book, last, onSave, onClose }: {
  book: Book
  last?: ProgressEntry
  onSave: (book: Book, entry: Omit<ProgressEntry, "bookId" | "createdAt">) => Promise<ProgressEntry>
  onClose: () => void
}) {
  const [mode, setMode] = useState<ProgressMode>(last?.mode ?? "page")
  const [value, setValue] = useState(last ? String(last.mode === "page" ? last.page ?? "" : Math.round(last.percent ?? 0)) : "")
  const [total, setTotal] = useState(last?.totalPages ? String(last.totalPages) : "")
  const [totalSource, setTotalSource] = useState<"reader" | "lookup" | null>(last?.totalPages ? "reader" : null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  // Total pages: filled from public data when this read has none yet. The reader can always correct it.
  useEffect(() => {
    if (last?.totalPages) return
    let live = true
    void (async () => {
      try {
        const { data } = await createClientSupabaseClient().auth.getSession()
        const token = data.session?.access_token
        const n = token ? await lookupOwnPageCount(token, book.id) : null
        if (live && n) { setTotal(t => t || String(n)); setTotalSource(s => s || "lookup") }
      } catch {}
    })()
    return () => { live = false }
  }, [book.id, last?.totalPages])

  const draft: ProgressEntry = {
    bookId: book.id, createdAt: "", mode,
    page: mode === "page" && value.trim() !== "" ? Number(value) : undefined,
    percent: mode === "percent" && value.trim() !== "" ? Number(value) : undefined,
    totalPages: total.trim() !== "" && Number.isInteger(Number(total)) ? Number(total) : undefined,
  }
  const livePct = checkInError(mode, value, total) ? null : percentOf(draft)
  const liveLeft = checkInError(mode, value, total) ? null : pagesLeft(draft)

  const submit = async () => {
    if (saving) return
    const problem = checkInError(mode, value, total)
    if (problem) { setError(problem); input.current?.focus(); return }
    setSaving(true); setError(null)
    try {
      await onSave(book, { mode, page: draft.page, percent: draft.percent, totalPages: draft.totalPages })
      if (totalSource === "lookup") track("progress.total_from_lookup", {}, book.id)
      onClose()
    } catch { setError("Progress was not saved. Please try again.") }
    finally { setSaving(false) }
  }
  const switchMode = (m: ProgressMode) => {
    if (m === mode) return
    // Carry the position across when the total is known, so switching never loses the place.
    const pct = percentOf(draft)
    if (m === "percent" && pct !== null) setValue(String(pct))
    else if (m === "page" && draft.percent !== undefined && draft.totalPages) setValue(String(Math.round(draft.totalPages * draft.percent / 100)))
    else setValue("")
    setMode(m); setError(null)
    setTimeout(() => input.current?.focus(), 0)
  }

  return <Dialog open onOpenChange={o => { if (!o && !saving) onClose() }}>
    <DialogContent className={sheet} onPointerDownOutside={e => { if (saving) e.preventDefault() }}>
      <DialogHeader className="text-left">
        <DialogTitle style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>Where are you up to?</DialogTitle>
        <DialogDescription className="truncate">{book.title}</DialogDescription>
      </DialogHeader>
      <form onSubmit={e => { e.preventDefault(); void submit() }} className="grid gap-3">
        <div role="radiogroup" aria-label="Track by" className="inline-flex w-fit rounded-full p-[3px]" style={{ background: "var(--bl-ede6dc)" }}>
          {(["page", "percent"] as const).map(m => <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => switchMode(m)}
            className={`rounded-full px-4 min-h-8 text-xs ${mode === m ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground"}`}>{m === "page" ? "Page" : "%"}</button>)}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <input ref={input} autoFocus inputMode={mode === "page" ? "numeric" : "decimal"} aria-label={mode === "page" ? "Page you are on" : "Percent read"}
            value={value} onChange={e => { setValue(e.target.value.replace(/[^\d.]/g, "").slice(0, 6)); setError(null) }}
            className="w-24 rounded-md border px-3 py-2 text-base text-foreground bg-card" style={{ borderColor: amber }} />
          {mode === "page"
            ? <><span>of</span><input inputMode="numeric" aria-label="Total pages" placeholder="?" value={total}
                onChange={e => { setTotal(e.target.value.replace(/\D/g, "").slice(0, 5)); setTotalSource("reader"); setError(null) }}
                className="w-16 rounded-md border border-border px-2 py-1.5 text-sm text-foreground bg-card" /><span>pages</span></>
            : <span>%</span>}
        </div>
        <p className="text-xs text-muted-foreground min-h-4" aria-live="polite">
          {livePct !== null ? <>Now <b className="text-foreground">{livePct}%</b>{liveLeft !== null ? ` · ${liveLeft} pages left` : ""}</> : mode === "page" && !total ? "Add the total to see what is left." : ""}
        </p>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
        <div className="flex items-center justify-end gap-4">
          <button type="button" disabled={saving} onClick={onClose} className="text-sm min-h-11" style={{ color: amber, textDecoration: "underline", textUnderlineOffset: 3 }}>Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md px-5 min-h-11 text-sm font-semibold disabled:opacity-50" style={{ background: amber, color: "var(--bl-primary-ink)" }}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}

function FinishChoiceDialog({ book, entry, onYes, onNotYet, onClose }: {
  book: Book
  entry?: ProgressEntry
  onYes: () => Promise<void>
  onNotYet: () => void
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pct = percentOf(entry)
  return <Dialog open onOpenChange={o => { if (!o && !busy) onClose() }}>
    <DialogContent className={sheet}>
      <DialogHeader className="text-left">
        <DialogTitle style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>Finished it?</DialogTitle>
        <DialogDescription className="truncate">{book.title}{pct !== null ? ` · ${pct}%` : ""}</DialogDescription>
      </DialogHeader>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      <div className="grid gap-2">
        <button type="button" disabled={busy} className="rounded-md min-h-12 text-sm font-semibold disabled:opacity-50" style={{ background: amber, color: "var(--bl-primary-ink)" }}
          onClick={async () => { setBusy(true); setError(null); try { await onYes() } catch { setError("Book was not moved. Please try again.") } finally { setBusy(false) } }}>
          {busy ? "Moving..." : "Yes, mark as completed"}
        </button>
        <button type="button" disabled={busy} className="rounded-md min-h-12 text-sm border border-border text-foreground" onClick={onNotYet}>Not yet, update progress</button>
      </div>
    </DialogContent>
  </Dialog>
}
