"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { StarRating } from "@/components/star-rating"

export default function AddBookPage() {
  const [bookData, setBookData] = useState({
    title: "",
    author: "",
    genre: "",
    publishedDate: "",
    pages: "",
    description: "",
    status: "reading",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Book data:", bookData)
    // Here you would typically save the data to your backend
    // Then redirect to the books page
  }

  return (
    <div className="container py-8">
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
              <Label htmlFor="pages">Number of Pages</Label>
              <Input id="pages" name="pages" value={bookData.pages} onChange={handleChange} type="number" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Reading Status</Label>
              <Select value={bookData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reading">Currently Reading</SelectItem>
                  <SelectItem value="queued">Want to Read</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="onHold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/books">Cancel</Link>
            </Button>
            <Button type="submit">Add Book</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
