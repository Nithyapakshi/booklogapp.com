"use client"
import { useEffect, useRef, useState } from "react"
import type { Book } from "@/types"
import { pickNext, type ShuffleState } from "@/lib/queue-shuffle"
import { track } from "@/lib/usage"
import { BookDetailsDialog } from "@/components/book-details-dialog"

// "From your queue": one queued book at a time, with Shuffle and Make it my next read.
// Read-only apart from the existing next-read save, which the parent owns.
export function QueueShuffle({books,busy,onMakeNext}:{books:Book[];busy:boolean;onMakeNext:(book:Book)=>void}) {
  const ids = books.map(b => b.id)
  const key = ids.join("|")
  const [state,setState] = useState<ShuffleState>({current:null,seen:[]})
  const shuffles = useRef(0)
  const shown = useRef(false)
  const [detailsOpen,setDetailsOpen] = useState(false)
  // First pick happens in the browser only, and again if the shown book leaves the queue.
  useEffect(() => {
    setState(prev => prev.current && ids.includes(prev.current) ? {...prev,seen:prev.seen.filter(id=>ids.includes(id))} : pickNext(ids,prev))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[key])
  const book = books.find(b => b.id === state.current)
  useEffect(() => {
    if (book && !shown.current) { shown.current = true; track("queue.shuffle_shown",{queued:books.length}) }
  },[book,books.length])
  if (!book) return null
  const shuffle = () => {
    if (busy) return
    shuffles.current += 1
    track("queue.shuffled",{n:shuffles.current,queued:books.length})
    setState(prev => pickNext(ids,prev))
  }
  const openDetails = () => { track("queue.shuffle_details",{},book.id); setDetailsOpen(true) }
  return <><section aria-label="From your queue" className="flex gap-3.5 items-start rounded-xl border border-border bg-card p-3.5 mt-4">
    <button type="button" aria-label={`Open details for ${book.title}`} onClick={openDetails} className="shrink-0">{book.cover ? <img src={book.cover} alt="" style={{width:64,height:96,objectFit:"contain"}}/> : <div aria-hidden="true" className="bg-muted rounded" style={{width:64,height:96}}/>}</button>
    <div className="min-w-0 flex-1">
      <h2 className="text-xs uppercase tracking-wide text-muted-foreground">From your queue</h2>
      <button type="button" onClick={openDetails} className="block mt-1 break-words text-left hover:underline" style={{fontFamily:"Georgia, serif",fontSize:17}}>{book.title}</button>
      <p className="text-sm text-muted-foreground mt-0.5 break-words">{book.author}{book.genre ? ` · ${book.genre}` : ""}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" disabled={busy} onClick={() => onMakeNext(book)} className="rounded-lg px-3.5 min-h-11 text-sm font-semibold disabled:opacity-40" style={{background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)"}}>{busy?"Saving...":"Make it my next read"}</button>
        <button type="button" disabled={busy} onClick={shuffle} aria-label="Shuffle to another queued book" className="rounded-lg border border-border px-3 min-h-11 text-sm text-muted-foreground flex items-center gap-1.5 disabled:opacity-40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>Shuffle
        </button>
      </div>
    </div>
  </section><BookDetailsDialog book={book} open={detailsOpen} onClose={() => setDetailsOpen(false)} mode="view"/></>
}
