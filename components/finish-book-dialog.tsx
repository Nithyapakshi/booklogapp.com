"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { todayLocal, isValidDate } from "@/lib/reading-dates"

export function FinishBookDialog({ book, onSave, onClose }: {
  book: { id: string; title: string; rating: number; finishedAt?: string }
  onSave: (rating: number, finishedAt: string) => Promise<void>
  onClose: () => void
}) {
  const [rating, setRating] = useState(book.rating)
  const [date, setDate] = useState(isValidDate(book.finishedAt) ? book.finishedAt : todayLocal())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    if (saving) return
    if (!isValidDate(date)) { setError("Pick a valid date."); return }
    setSaving(true)
    setError(null)
    try { await onSave(rating, date); onClose() }
    catch { setError("This was not saved. Try again or choose Skip.") }
    finally { setSaving(false) }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-sm" onPointerDownOutside={(e) => { if (saving) e.preventDefault() }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>Finished this book?</DialogTitle>
        <DialogDescription>{book.title} is in Completed. Add your rating and the day you finished, or skip.</DialogDescription>
      </DialogHeader>
      <div className="flex justify-center gap-2" role="group" aria-label="Your rating">
        {[1,2,3,4,5].map(star => <button key={star} type="button" aria-label={`Rate ${star} out of 5`} aria-pressed={rating === star} disabled={saving} onClick={() => setRating(star)} className={`text-3xl p-1 rounded focus-visible:outline focus-visible:outline-2 ${star <= rating ? "text-amber-400" : "text-gray-300"}`}>★</button>)}
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Finished on</span>
        <input type="date" value={date} max={todayLocal()} disabled={saving} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1" />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving} onClick={onClose}>Skip</Button>
        <Button disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
