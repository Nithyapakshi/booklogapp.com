"use client"
import { useState } from "react"
import Link from "next/link"
import { useBooks } from "@/lib/book-context"
import { Button } from "@/components/ui/button"
import type { Book } from "@/types"
export function BookEditForm({book, onDone}: {book: Book; onDone: () => void}) {
 const {editBook} = useBooks()
 const [title, setTitle] = useState(book.title)
 const [author, setAuthor] = useState(book.author)
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [duplicate, setDuplicate] = useState<Book | null>(null)
 return <form className="space-y-4" onSubmit={async e => {
  e.preventDefault(); if (saving) return; setSaving(true); setError(null); setDuplicate(null)
  try { const result = await editBook(book.id, {title, author}); if (result.outcome === "duplicate") setDuplicate(result.books[0]); else onDone() }
  catch (e) {setError(e instanceof Error ? e.message : "Book was not saved. Please try again.")}
  finally {setSaving(false)}
 }}>
  <label className="block text-sm">Title<input className="block w-full rounded border px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={500} /></label>
  <label className="block text-sm">Author<input className="block w-full rounded border px-3 py-2" value={author} onChange={e=>setAuthor(e.target.value)} required maxLength={500} /></label>
  <p className="text-xs text-muted-foreground">Your notes, rating and reading lists stay unchanged. Cover and description are filled in automatically.</p>
  {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
  {duplicate && <p role="alert">Already in your library: {duplicate.title}. <a className="underline" href={`/books?book=${encodeURIComponent(duplicate.id)}`}>View existing book</a></p>}
  <div className="flex gap-2"><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save details"}</Button><Button type="button" variant="outline" disabled={saving} onClick={onDone}>Cancel</Button></div>
 </form>
}
