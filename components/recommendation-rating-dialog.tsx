"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function RecommendationRatingDialog({ book, onSave, onClose }: {
  book: { id: string; title: string; rating: number }
  onSave: (rating: number) => Promise<void>
  onClose: () => void
}) {
  const [rating, setRating] = useState(book.rating)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    if (!rating || saving) return
    setSaving(true)
    setError(null)
    try { await onSave(rating); onClose() }
    catch { setError("Rating was not saved. Try again or choose Not now.") }
    finally { setSaving(false) }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-sm" onPointerDownOutside={(e) => { if (saving) e.preventDefault() }} onEscapeKeyDown={(e) => { if (saving) e.preventDefault() }}>
      <DialogHeader>
        <DialogTitle>Rate your recommendation</DialogTitle>
        <DialogDescription>{book.title} is in Recommendations. How would you rate it?</DialogDescription>
      </DialogHeader>
      <div className="flex justify-center gap-2" role="group" aria-label="Recommendation rating">
        {[1,2,3,4,5].map(star => <button key={star} type="button" aria-label={`Rate ${star} out of 5`} aria-pressed={rating === star} disabled={saving} onClick={() => setRating(star)} className={`text-3xl p-1 rounded focus-visible:outline focus-visible:outline-2 ${star <= rating ? "text-amber-400" : "text-gray-300"}`}>★</button>)}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving} onClick={onClose}>Not now</Button>
        <Button disabled={!rating || saving} onClick={save}>{saving ? "Saving..." : "Save rating"}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
