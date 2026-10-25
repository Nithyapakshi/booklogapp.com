"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { MonthDayPicker } from "@/components/month-day-picker"
import { Button } from "@/components/ui/button"
import { todayLocal, isValidDate, promptReadingDate, type DatePrecision } from "@/lib/reading-dates"

export function StartBookDialog({ book, onSave, onClose }: {
  book: { id: string; title: string; startedAt?: string; startedPrecision?: DatePrecision }
  onSave: (startedAt: string, precision: DatePrecision) => Promise<void>
  onClose: () => void
}) {
  const [picked, setPicked] = useState(() => promptReadingDate(book.startedAt, book.startedPrecision))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    if (saving) return
    if (!isValidDate(picked.value)) { setError("Pick a valid date."); return }
    if (picked.precision === "month" ? picked.value.slice(0, 7) > todayLocal().slice(0, 7) : picked.value > todayLocal()) { setError("The start date cannot be in the future."); return }
    setSaving(true)
    setError(null)
    try { await onSave(picked.value, picked.precision); onClose() }
    catch { setError("This was not saved. Try again or choose Skip.") }
    finally { setSaving(false) }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-sm" onPointerDownOutside={(e) => { if (saving) e.preventDefault() }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>Started this book?</DialogTitle>
        <DialogDescription>{book.title} is in Reading. Add the month (and day, if you know it) you started, or skip.</DialogDescription>
      </DialogHeader>
      <MonthDayPicker label="Started" value={picked.value} precision={picked.precision} onChange={setPicked} disabled={saving} />
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving} onClick={onClose}>Skip</Button>
        <Button disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
