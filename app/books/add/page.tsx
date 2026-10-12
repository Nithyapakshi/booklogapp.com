"use client"

import { nearDuplicate } from "@/lib/book-identity"
import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useBooks, type BookStatus } from "@/lib/book-context"
import { useRouter } from "next/navigation"

export default function AddBookPage() {
  const { createBook, loading, books } = useBooks()
  const router = useRouter()
  const [duplicate, setDuplicate] = useState<{id: string; title: string; status: string} | null>(null)
  const [saving, setSaving] = useState(false)
  const [near, setNear] = useState<{id: string; title: string; author: string} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bookData, setBookData] = useState({ title: "", author: "", status: "queued" })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setBookData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setBookData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent, confirmed = false) => {
    e.preventDefault()
    if (saving || loading) return
    if (!confirmed) {
      const similar = nearDuplicate({ title: bookData.title.trim(), author: bookData.author.trim() }, Object.values(books).flat())
      if (similar) { setNear(similar); return }
    }
    setNear(null)
    setSaving(true); setError(null); setDuplicate(null)
    try {
      const result = await createBook({ id: crypto.randomUUID(), title: bookData.title.trim(), author: bookData.author.trim() }, bookData.status as BookStatus)
      if (result.outcome === "duplicate") { setDuplicate(result.books[0]); return }
      router.push("/books")
    } catch (e) { setError(e instanceof Error ? e.message : "Book was not saved. Please try again.") }
    finally { setSaving(false) }
  }

  return (
    <div className="container px-4 sm:px-6 py-8">
      <Link href="/books" className="flex items-center text-primary mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Books
      </Link>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Add New Book</h1>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-[10px] border border-border bg-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Book Title</Label>
              <Input id="title" name="title" value={bookData.title} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author (optional)</Label>
              <Input id="author" name="author" value={bookData.author} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Reading Status</Label>
              <select id="status" value={bookData.status} onChange={e => handleSelectChange("status", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="reading">Currently Reading</option>
                <option value="queued">Want to Read</option>
                <option value="completed">Completed</option>
                <option value="onHold">On Hold</option>
              </select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">We will look up the cover and description for you after you add it.</p>

          {near && <div role="alert" className="rounded-md border p-4 bg-amber-50 dark:bg-muted">
            <p>This looks like a book you already have: {near.title} by {near.author}.</p>
            <button type="button" className="underline mr-4" onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}>Add anyway</button>
            <Link className="underline" href={`/books?book=${encodeURIComponent(near.id)}`}>View existing book</Link>
          </div>}
          {duplicate && <div role="alert" className="rounded-md border p-4 bg-amber-50 dark:bg-muted">
            <p>Already in your library: {duplicate.title} ({({reading: "Reading", queued: "Queued", completed: "Completed", recommended: "Recommendations", onHold: "On Hold"} as Record<string, string>)[duplicate.status] || duplicate.status})</p>
            <Link className="underline" href={`/books?book=${encodeURIComponent(duplicate.id)}`}>View existing book</Link>
          </div>}
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/books">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving || loading}>{saving ? "Saving..." : "Add Book"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
