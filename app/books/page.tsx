"use client"

import { useState, useEffect } from "react"
import { useBooks, mapTabToStatus } from "@/lib/book-context"
import BookCard from "@/components/book-card"
import BookSearch from "@/components/book-search"
import type { Book } from "@/types"
import { AiRecommendationCard } from "@/components/ai-recommendation-card"
import { BooksHeader } from "@/components/books-header"

export default function BooksPage() {
  const [activeTab, setActiveTab] = useState("Reading")

  useEffect(() => {
    const savedTab = localStorage.getItem("booklog-active-tab")
    if (savedTab) {
      setActiveTab(savedTab)
      localStorage.removeItem("booklog-active-tab")
    }
  }, [])

  const { getBooksByStatus, getBookCountByStatus, removeBook } = useBooks()
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])

  useEffect(() => {
    const status = mapTabToStatus(activeTab)
    setFilteredBooks(getBooksByStatus(status))
  }, [activeTab, getBooksByStatus])

  const tabs = [
    { name: "Reading", count: getBookCountByStatus("reading") },
    { name: "Queued", count: getBookCountByStatus("queued") },
    { name: "Completed", count: getBookCountByStatus("completed") },
    { name: "My recommendation", count: getBookCountByStatus("recommended") },
    { name: "On Hold", count: getBookCountByStatus("onHold") },
  ]

  return (
    <div className="container mx-auto py-10">
      <BooksHeader />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side: Search, tabs, and book grid */}
        <div className="lg:w-3/4">
          {/* Search bar */}
          <div className="mb-4">
            <BookSearch />
          </div>

          {/* Tabs - directly below search with reduced margin */}
          <div className="mb-2">
            <ul className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <li
                  key={tab.name}
                  className={`cursor-pointer px-4 py-2 rounded-md ${
                    activeTab === tab.name ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                  onClick={() => setActiveTab(tab.name)}
                >
                  {tab.name} ({tab.count})
                </li>
              ))}
            </ul>
          </div>

          {/* Book Grid - now contained within the left column */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} removeBook={removeBook} />
            ))}
            {filteredBooks.length === 0 && (
              <div className="col-span-full text-gray-500 text-center py-8">No books in this category.</div>
            )}
          </div>
        </div>

        {/* Right side: AI Recommendation Card */}
        <div className="lg:w-1/4">
          <AiRecommendationCard />
        </div>
      </div>
    </div>
  )
}
