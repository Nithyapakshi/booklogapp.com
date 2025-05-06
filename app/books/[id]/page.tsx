"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StarRating } from "@/components/star-rating"
import { ArrowLeft, Clock, Calendar, Edit, Share2 } from "lucide-react"
import Link from "next/link"
import { Progress } from "@/components/ui/progress"

// Mock book data
const bookDetails = {
  id: 1,
  title: "Welcome to the Hyunam-dong Bookshop",
  author: "Hwang Bo-reum",
  cover: "https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg",
  amazonRating: 4.2,
  selfRating: 0,
  recommendedBy: "-",
  status: "reading",
  genre: "Fiction",
  publishedDate: "January 15, 2023",
  pages: 320,
  currentPage: 120,
  description:
    "A heartwarming story about a small bookshop in Seoul that becomes a sanctuary for people seeking solace and connection. The owner, a quiet and introspective woman, finds herself drawn into the lives of her customers as they share their stories and discover new books.",
  notes: "",
  startDate: "March 10, 2023",
  estimatedFinishDate: "April 20, 2023",
}

export default function BookDetailPage({ params }: { params: { id: string } }) {
  const [notes, setNotes] = useState(bookDetails.notes)
  const progress = Math.round((bookDetails.currentPage / bookDetails.pages) * 100)

  return (
    <div className="container py-8">
      <Link href="/books" className="flex items-center text-primary mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Books
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column - Book cover and basic info */}
        <div className="flex flex-col items-center">
          <div className="w-[200px] h-[300px] rounded-lg shadow-md mb-4 overflow-hidden">
            {bookDetails.cover ? (
              <img
                src={bookDetails.cover || "/placeholder.svg"}
                alt={bookDetails.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // If image fails, show a colored div with text
                  const target = e.currentTarget
                  target.onerror = null
                  target.style.backgroundColor = "#e5e7eb"
                  target.style.display = "flex"
                  target.style.alignItems = "center"
                  target.style.justifyContent = "center"
                  target.style.color = "#6b7280"
                  target.style.fontSize = "14px"
                  target.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
                }}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">No Cover</div>
            )}
          </div>

          <h1 className="text-xl font-bold text-center mb-2">{bookDetails.title}</h1>
          <p className="text-gray-600 mb-4">{bookDetails.author}</p>

          <div className="flex items-center mb-4">
            <StarRating rating={bookDetails.amazonRating} className="mr-2" />
            <span className="text-sm text-gray-600">({bookDetails.amazonRating})</span>
          </div>

          <div className="w-full space-y-4">
            <Button className="w-full">Update Progress</Button>
            <Button variant="outline" className="w-full">
              Mark as Complete
            </Button>
          </div>
        </div>

        {/* Middle column - Book details and progress */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Book Details</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500">Genre</p>
                <p>{bookDetails.genre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Published</p>
                <p>{bookDetails.publishedDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pages</p>
                <p>{bookDetails.pages}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="capitalize">{bookDetails.status}</p>
              </div>
            </div>

            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-gray-700 mb-6">{bookDetails.description}</p>

            <h3 className="font-medium mb-2">Your Progress</h3>
            <div className="mb-2 flex justify-between text-sm">
              <span>
                Page {bookDetails.currentPage} of {bookDetails.pages}
              </span>
              <span>{progress}% complete</span>
            </div>
            <Progress value={progress} className="mb-4" />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Started</p>
                  <p className="text-sm">{bookDetails.startDate}</p>
                </div>
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Est. Finish</p>
                  <p className="text-sm">{bookDetails.estimatedFinishDate}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Your Notes</h2>
              <div className="flex space-x-2">
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes about this book here..."
              className="w-full h-40 p-3 border rounded-md"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
