"use client"
import { useState } from "react"
import Link from "next/link"
import { useBooks } from "@/lib/book-context"
import { Button } from "@/components/ui/button"
import { MonthDayPicker } from "@/components/month-day-picker"
import { isValidDate, toPrecision, todayLocal, type DatePrecision } from "@/lib/reading-dates"
import type { Book } from "@/types"
export function BookEditForm({book, onDone}: {book: Book; onDone: () => void}) {
 const {editBook, saveDates} = useBooks()
 const [title, setTitle] = useState(book.title)
 const [author, setAuthor] = useState(book.author)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [duplicate, setDuplicate] = useState<Book | null>(null)
 const showStart = ["reading", "completed", "recommended", "onHold"].includes(book.status)
 const showFinish = ["completed", "recommended"].includes(book.status)
 const startedValue0 = isValidDate(book.startedAt) ? book.startedAt : ""
 const finishedValue0 = isValidDate(book.finishedAt) ? book.finishedAt : ""
 const [started, setStarted] = useState<{value: string; precision: DatePrecision}>({value: startedValue0, precision: toPrecision(book.startedPrecision)})
 const [finished, setFinished] = useState<{value: string; precision: DatePrecision}>({value: finishedValue0, precision: toPrecision(book.finishedPrecision)})
 const startChanged = started.value !== startedValue0 || (started.value !== "" && started.precision !== toPrecision(book.startedPrecision))
 const finishChanged = finished.value !== finishedValue0 || (finished.value !== "" && finished.precision !== toPrecision(book.finishedPrecision))
 // Month-only dates compare by month, so a book started and finished in the same month is allowed.
 const monthOf = (d: {value: string; precision: DatePrecision}) => d.value.slice(0, 7)
 const today = todayLocal()
 const futureMsg = (d: {value: string; precision: DatePrecision}) => d.value && (d.precision === "month" ? monthOf(d) > today.slice(0, 7) : d.value > today)
 return <form className="space-y-4" onSubmit={async e => {
  e.preventDefault(); if (saving) return; setError(null); setDuplicate(null)
  if (showStart && startChanged && futureMsg(started)) { setError("The start date cannot be in the future."); return }
  if (showFinish && finishChanged && futureMsg(finished)) { setError("The finish date cannot be in the future."); return }
  if (showStart && showFinish && started.value && finished.value) {
   const s = started.precision === "month" || finished.precision === "month" ? monthOf(started) : started.value
   const f = started.precision === "month" || finished.precision === "month" ? monthOf(finished) : finished.value
   if (f < s) { setError("The finish date is before the start date."); return }
  }
  setSaving(true)
  try {
   const result = await editBook(book.id, {title, author})
   if (result.outcome === "duplicate") { setDuplicate(result.books[0]); return }
   if ((showStart && startChanged) || (showFinish && finishChanged)) {
    await saveDates(book.id, {
     ...(showStart && startChanged ? {startedAt: started.value || null, startedPrecision: started.precision} : {}),
     ...(showFinish && finishChanged ? {finishedAt: finished.value || null, finishedPrecision: finished.precision} : {}),
    })
   }
   onDone()
  }
  catch (e) {setError(e instanceof Error ? e.message : "Book was not saved. Please try again.")}
  finally {setSaving(false)}
 }}>
  <label className="block text-sm">Title<input className="block w-full rounded border px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={500} /></label>
  <label className="block text-sm">Author<input className="block w-full rounded border px-3 py-2" value={author} onChange={e=>setAuthor(e.target.value)} required maxLength={500} /></label>
  {(showStart || showFinish) && <div className="space-y-3">
   <p className="text-sm font-medium">Dates <span className="font-normal text-gray-500">(optional)</span></p>
   {showStart && <MonthDayPicker label="Started" value={started.value} precision={started.precision} onChange={setStarted} disabled={saving} />}
   {showFinish && <MonthDayPicker label="Finished" value={finished.value} precision={finished.precision} onChange={setFinished} disabled={saving} />}
  </div>}
  <p className="text-xs text-gray-500">Your notes, rating and reading lists stay unchanged. Cover and description are filled in automatically.</p>
  {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  {duplicate && <p role="alert">Already in your library: {duplicate.title}. <a className="underline" href={`/books?book=${encodeURIComponent(duplicate.id)}`}>View existing book</a></p>}
  <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save details"}</Button><Button type="button" variant="outline" disabled={saving} onClick={onDone}>Cancel</Button></div>
 </form>
}
