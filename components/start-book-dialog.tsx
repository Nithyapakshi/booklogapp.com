"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { todayLocal, isValidDate } from "@/lib/reading-dates"

export function StartBookDialog({ book, onSave, onClose }: {
  book: { id: string; title: string; startedAt?: string }
  onSave: (startedAt: string) => Promise<void>
  onClose: () => void
}) {
  const [date, setDate] = useState(isValidDate(book.startedAt) ? book.startedAt : todayLocal())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    if (saving) return
    if (!isValidDate(date)) { setError("Pick a valid date."); return }
    setSaving(true)
    setError(null)
    try { await onSave(date); onClose() }
    catch { setError("This was not saved. Try again or choose Skip.") }
    finally { setSaving(false) }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-sm" onPointerDownOutside={(e) => { if (saving) e.preventDefault() }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>Started this book?</DialogTitle>
        <DialogDescription>{book.title} is in Reading. Add the day you started, or skip.</DialogDescription>
      </DialogHeader>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Started on</span>
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
