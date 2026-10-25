"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MonthDayPicker } from "@/components/month-day-picker"
import { todayLocal, isValidDate, promptReadingDate, type DatePrecision } from "@/lib/reading-dates"

export function FinishBookDialog({ book, direct, onSave, onClose }: {
  book: { id: string; title: string; rating: number; finishedAt?: string; finishedPrecision?: DatePrecision; where: "Completed" | "Recommendations" }
  direct?: boolean
  onSave: (rating: number, finishedAt: string, precision: DatePrecision) => Promise<void>
  onClose: () => void
}) {
  const [rating, setRating] = useState(book.rating)
  const [monthPick, setMonthPick] = useState(() => promptReadingDate(book.finishedAt, book.finishedPrecision))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    if (saving) return
    const chosen = monthPick.value
    if (!isValidDate(chosen)) { setError("Pick a valid date."); return }
    if (monthPick.precision === "month" ? chosen.slice(0, 7) > todayLocal().slice(0, 7) : chosen > todayLocal()) { setError("The finish date cannot be in the future."); return }
    setSaving(true)
    setError(null)
    try { await onSave(rating, chosen, monthPick.precision); onClose() }
    catch { setError("This was not saved. Try again or choose Skip.") }
    finally { setSaving(false) }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-sm" onPointerDownOutside={(e) => { if (saving) e.preventDefault() }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>Finished this book?</DialogTitle>
        <DialogDescription>{book.title} is in {book.where}. Add your rating and the month (and day, if you know it) you finished, or skip.</DialogDescription>
      </DialogHeader>
      <div className="flex justify-center gap-2" role="group" aria-label="Your rating">
        {[1,2,3,4,5].map(star => <button key={star} type="button" aria-label={`Rate ${star} out of 5`} aria-pressed={rating === star} disabled={saving} onClick={() => setRating(star)} className={`text-3xl p-1 rounded focus-visible:outline focus-visible:outline-2 ${star <= rating ? "text-amber-400" : "text-muted-foreground/40"}`}>★</button>)}
      </div>
      <MonthDayPicker label="Finished" value={monthPick.value} precision={monthPick.precision} onChange={setMonthPick} disabled={saving} />
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving} onClick={onClose}>Skip</Button>
        <Button disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
