"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, BookOpen } from "lucide-react"
import Link from "next/link"
import { getAIBookRecommendations } from "@/app/actions/ai-recommendations"
import type { BookSearchResult } from "@/types"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import { OpenAISetupInstructions } from "@/components/openai-setup-instructions"

// Function to generate a deterministic color based on book title
function generateBookColor(title: string): string {
  // Simple hash function to generate a number from a string
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }

  // Convert hash to a hue value (0-360)
  const hue = Math.abs(hash) % 360

  // Use a fixed saturation and lightness for pastel colors
  return `hsl(${hue}, 70%, 80%)`
}

// Component for book cover fallback
function BookCoverFallback({ title, author }: { title: string; author: string }) {
  const bgColor = useMemo(() => generateBookColor(title), [title])
  const initials = useMemo(() => {
    const titleInitial = title.charAt(0)
    const authorInitial = author.split(" ")[0].charAt(0)
    return (titleInitial + authorInitial).toUpperCase()
  }, [title, author])

  return (
    <div
      className="w-full h-full flex items-center justify-center text-white font-bold text-xl"
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  )
}

export default function AiRecommendationsPage() {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<BookSearchResult[] | null>(null)
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSetupInstructions, setShowSetupInstructions] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if the prompt is empty or just whitespace
    if (!prompt || prompt.trim() === "") {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const results = await getAIBookRecommendations(prompt)
      setRecommendations(results)
    } catch (err) {
      console.error("Error getting recommendations:", err)

      // Check if the error is related to missing API key
      const errorMessage = err instanceof Error ? err.message : String(err)
      if (errorMessage.includes("OpenAI API key is missing")) {
        setError("OpenAI API key is missing. Please add it to your environment variables.")
        setShowSetupInstructions(true)
      } else {
        setError("Sorry, we couldn't generate recommendations. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookSelect = (book: BookSearchResult) => {
    setSelectedBook(book)
    setDialogOpen(true)
  }

  return (
    <div className="container mx-auto py-10">
      <Link href="/books" className="flex items-center text-primary mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Books
      </Link>

      <h1 className="text-3xl font-bold mb-6">AI Book Recommendations</h1>

      {error && error.includes("OpenAI API key") && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3 flex-grow">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> {error} To get AI-powered recommendations, please add your OpenAI API key.
              </p>
            </div>
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSetupInstructions(!showSetupInstructions)}
                className="text-yellow-700 text-sm"
              >
                {showSetupInstructions ? "Hide Instructions" : "Show Instructions"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSetupInstructions && (
        <div className="mb-6">
          <OpenAISetupInstructions />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Tell us what you like</h2>
            <p className="text-gray-600 mb-4">
              Describe the types of books you enjoy, authors you like, or themes you're interested in. Our AI will
              suggest books tailored to your preferences.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="I enjoy science fiction with strong character development, especially books like Dune and The Three-Body Problem..."
                className="min-h-[150px]"
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Generating recommendations..." : "Get Recommendations"}
              </Button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600">Analyzing your preferences...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg">
              <h3 className="font-bold mb-2">Error</h3>
              <p>{error}</p>
            </div>
          ) : recommendations ? (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Your Personalized Recommendations</h2>

              {recommendations.map((book, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-md overflow-hidden flex cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleBookSelect(book)}
                >
                  <div className="w-1/4 min-w-[100px] max-w-[120px] h-[150px] bg-gray-100 flex items-center justify-center overflow-hidden">
                    {book.cover ? (
                      <img
                        src={book.cover || "/placeholder.svg"}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If image fails to load, replace with our fallback component
                          e.currentTarget.style.display = "none"
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            const fallback = document.createElement("div")
                            fallback.className = "w-full h-full"
                            fallback.style.backgroundColor = generateBookColor(book.title)
                            fallback.style.display = "flex"
                            fallback.style.alignItems = "center"
                            fallback.style.justifyContent = "center"
                            fallback.style.color = "white"
                            fallback.style.fontWeight = "bold"
                            fallback.style.fontSize = "1.25rem"

                            const initials = (book.title.charAt(0) + book.author.split(" ")[0].charAt(0)).toUpperCase()
                            fallback.textContent = initials

                            parent.appendChild(fallback)
                          }
                        }}
                      />
                    ) : (
                      <BookCoverFallback title={book.title} author={book.author} />
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="font-bold text-lg">{book.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                    <p className="text-sm text-gray-700">{book.description}</p>
                    {book.publishedYear && (
                      <p className="text-xs text-gray-500 mt-2">Published: {book.publishedYear}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Enter your preferences and click "Get Recommendations" to see personalized book suggestions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Book details dialog */}
      <BookDetailsDialog book={selectedBook} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="add" />
    </div>
  )
}
