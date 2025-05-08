"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, BookOpen } from "lucide-react"
import Link from "next/link"
import { getAIBookRecommendations } from "@/app/actions/ai-recommendations"
import type { Book, BookSearchResult } from "@/types"
import { BookDetailsDialog } from "@/components/book-details-dialog-fix"
import { OpenAISetupInstructions } from "@/components/openai-setup-instructions"
import { getCachedRecommendations, cacheRecommendations } from "@/lib/recommendation-cache"
import { createClientSupabaseClient } from "@/lib/supabase/client"

function generateBookColor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 80%)`
}

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

function isAlreadyInCollection(book: BookSearchResult, userBooks: Book[]): boolean {
  return userBooks.some(
    (b) =>
      b.title.trim().toLowerCase() === book.title.trim().toLowerCase() &&
      b.author.trim().toLowerCase() === book.author.trim().toLowerCase()
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
  const [usedCache, setUsedCache] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [userBooks, setUserBooks] = useState<Book[]>([])

  useEffect(() => {
    const fetchBooks = async () => {
      const supabase = createClientSupabaseClient()
      const response = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false }) as { data: Book[] | null, error: any }

      const { data, error } = response

      if (error) {
        console.error("Error fetching user books:", error)
      } else {
        setUserBooks(data ?? [])
      }
    }

    fetchBooks()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt || prompt.trim() === "") return

    const rawPrompt = prompt.trim()
    if (rawPrompt.length < 10) {
      setError("Your query is too short. Please describe what you're looking for.")
      return
    }

    setIsLoading(true)
    setError(null)
    setUsedCache(false)

    try {
      const exclusionList = userBooks.map((b) => `- ${b.title} by ${b.author}`).join("\n")
      const fullPrompt =
        exclusionList.length > 0
          ? `Please recommend books based on this preference: "${rawPrompt}". But exclude books I’ve already read:\n${exclusionList}`
          : rawPrompt

      if (fullPrompt.length > 3000) {
        setError("Your query is too long for our system to process. Try removing some books from your collection or shortening your input.")
        setIsLoading(false)
        return
      }

      const cachedResults = getCachedRecommendations(fullPrompt)
      if (cachedResults && cachedResults.length > 0) {
        setRecommendations(cachedResults)
        setUsedCache(true)
        setIsLoading(false)
        return
      }

      const results = await getAIBookRecommendations(fullPrompt)
      const filteredResults = results.filter((book) => !isAlreadyInCollection(book, userBooks))

      if (!filteredResults || filteredResults.length === 0) {
        setError("No new recommendations found — everything matched your collection.")
        setRecommendations(null)
      } else {
        setRecommendations(filteredResults)
        if (typeof window !== "undefined") {
          cacheRecommendations(fullPrompt, filteredResults)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("OpenAI API key is missing")) {
        setError("OpenAI API key is missing. Please add it to your environment variables.")
        setShowSetupInstructions(true)
      } else {
        setError(`Failed to get recommendations: ${msg}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookSelect = (book: BookSearchResult) => {
    setSelectedBook(book)
    setDialogOpen(true)
    setSuccessMessage(null)
  }

  const handleClearResults = () => {
    setPrompt("")
    setRecommendations(null)
    setError(null)
    setUsedCache(false)
  }

  return (
    <div className="container mx-auto py-10">
      <Link href="/books" className="flex items-center text-primary mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Books
      </Link>

      <h1 className="text-3xl font-bold mb-6">AI Book Recommendations</h1>

      {error?.includes("OpenAI API key") && (
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

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Generating..." : "Get Recommendations"}
                </Button>

                {recommendations && (
                  <Button type="button" variant="outline" onClick={handleClearResults} disabled={isLoading}>
                    Clear
                  </Button>
                )}
              </div>
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
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Your Personalized Recommendations</h2>
                {process.env.NODE_ENV === "development" && usedCache && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Loaded from cache</span>
                )}
              </div>

              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-md mb-4 flex justify-between items-center">
                  <p>{successMessage}</p>
                  <button onClick={() => setSuccessMessage(null)} className="text-green-700 hover:text-green-900">
                    ×
                  </button>
                </div>
              )}

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
                      />
                    ) : (
                      <BookCoverFallback title={book.title} author={book.author} />
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="font-bold text-lg">{book.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                    <p className="text-sm text-purple-600 italic mb-1">{book.genre || "Unknown Genre"}</p>
                    <p className="text-sm text-gray-700 line-clamp-3">{book.description}</p>
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

      {selectedBook && (
        <BookDetailsDialog book={selectedBook} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="add" />
      )}
    </div>
  )
}
