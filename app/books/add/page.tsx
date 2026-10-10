"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useBooks, type BookStatus } from "@/lib/book-context"
import { useRouter } from "next/navigation"
import { StarRating } from "@/components/star-rating"

export default function AddBookPage() {
  const { createBook, loading } = useBooks()
  const router = useRouter()
  const [duplicate, setDuplicate] = useState<{id: string; title: string; status: string} | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    genre: "",
    publishedDate: "",
    pages: "",
    description: "",
    status: "queued",
    cover: "",
    rating: 0,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setBookData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setBookData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRatingChange = (rating: number) => {
    setBookData((prev) => ({ ...prev, rating }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || loading) return
    setSaving(true); setError(null); setDuplicate(null)
    try {
      const result = await createBook({
        id: crypto.randomUUID(), title: bookData.title.trim(), author: bookData.author.trim(),
        cover: bookData.cover, genre: bookData.genre, description: bookData.description,
        publishedYear: bookData.publishedDate ? Number(bookData.publishedDate.slice(0, 4)) : undefined,
        selfRating: bookData.rating,
      }, bookData.status as BookStatus)
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Book Title</Label>
              <Input id="title" name="title" value={bookData.title} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" name="author" value={bookData.author} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Input id="genre" name="genre" value={bookData.genre} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publishedDate">Published Date</Label>
              <Input
                id="publishedDate"
                name="publishedDate"
                value={bookData.publishedDate}
                onChange={handleChange}
                type="date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Reading Status</Label>
              <select id="status" value={bookData.status} onChange={e => handleSelectChange("status", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                <option value="reading">Currently Reading</option>
                <option value="queued">Want to Read</option>
                <option value="completed">Completed</option>
                <option value="onHold">On Hold</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover">Cover URL (optional)</Label>
            <Input id="cover" name="cover" type="url" value={bookData.cover} onChange={handleChange} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Book Description</Label>
            <Textarea
              id="description"
              name="description"
              value={bookData.description}
              onChange={handleChange}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Your Rating</Label>
            <StarRating rating={bookData.rating} interactive={true} onRatingChange={handleRatingChange} size={24} />
          </div>

          {duplicate && <div role="alert" className="rounded-md border p-4 bg-amber-50">
            <p>Already in your library: {duplicate.title} ({duplicate.status})</p>
            <Link className="underline" href={`/books?book=${encodeURIComponent(duplicate.id)}`}>View existing book</Link>
          </div>}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
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
