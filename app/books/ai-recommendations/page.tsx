"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getAIBookRecommendations } from "@/app/actions/ai-recommendations"
import type { BookSearchResult } from "@/types"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import { OpenAISetupInstructions } from "@/components/openai-setup-instructions"

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
    <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: bgColor }}>
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
    if (!prompt || prompt.trim() === "") return

    setIsLoading(true)
    setError(null)

    try {
      const results = await getAIBookRecommendations(prompt)
      setRecommendations(results)
    } catch (err) {
      console.error("Error getting recommendations:", err)
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
    <div className="container mx-auto py-8" style={{ fontFamily: "DM Sans, sans-serif" }}>

      {/* Back link */}
      <Link href="/books" className="flex items-center mb-6" style={{ color: "#c17f3e", fontSize: "13px", textDecoration: "none" }}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Books
      </Link>

      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "26px", color: "#1a1208", fontWeight: "normal", marginBottom: "1.5rem" }}>
        Discover Books
      </h1>

      {/* API key warning */}
      {error && error.includes("OpenAI API key") && (
        <div style={{ background: "#fef9f0", border: "0.5px solid #e0c9a8", borderLeft: "3px solid #c17f3e", padding: "12px 16px", marginBottom: "1.5rem", borderRadius: "7px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "13px", color: "#7a5530" }}>
            <strong>Note:</strong> {error} To get AI-powered recommendations, please add your OpenAI API key.
          </p>
          <button
            onClick={() => setShowSetupInstructions(!showSetupInstructions)}
            style={{ fontSize: "12px", color: "#c17f3e", background: "none", border: "none", cursor: "pointer", marginLeft: "1rem", whiteSpace: "nowrap" }}
          >
            {showSetupInstructions ? "Hide instructions" : "Show instructions"}
          </button>
        </div>
      )}

      {showSetupInstructions && (
        <div style={{ marginBottom: "1.5rem" }}>
          <OpenAISetupInstructions />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: prompt panel */}
        <div className="lg:col-span-1">
          <div style={{ background: "#fff", border: "0.5px solid #e0d5c4", borderRadius: "10px", padding: "1.5rem" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#1a1208", fontWeight: "normal", marginBottom: "8px" }}>
              Tell us what you like
            </h2>
            <p style={{ fontSize: "13px", color: "#8a7560", lineHeight: "1.65", marginBottom: "1.25rem" }}>
              Describe the types of books you enjoy, authors you like, or themes you're interested in.
            </p>

            <form onSubmit={handleSubmit}>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="I enjoy science fiction with strong character development, especially books like Dune and The Three-Body Problem..."
                className="min-h-[150px] mb-4"
                style={{ fontSize: "13px", border: "0.5px solid #d4c5a9", borderRadius: "7px", background: "#faf7f2", color: "#1a1208" }}
              />
              <button
                type="submit"
                disabled={isLoading}
                style={{ width: "100%", padding: "10px", background: isLoading ? "#d4a574" : "#c17f3e", color: "#fff", border: "none", borderRadius: "7px", fontSize: "13px", fontWeight: "500", cursor: isLoading ? "not-allowed" : "pointer", fontFamily: "DM Sans, sans-serif" }}
              >
                {isLoading ? "Generating..." : "Get Recommendations"}
              </button>
            </form>
          </div>
        </div>

        {/* Right: results panel */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div style={{ width: "36px", height: "36px", border: "2.5px solid #e0d5c4", borderTopColor: "#c17f3e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ marginTop: "1rem", fontSize: "13px", color: "#8a7560" }}>Analysing your preferences...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error && !error.includes("OpenAI API key") ? (
            <div style={{ background: "#fdf2f2", border: "0.5px solid #e8c4c4", borderRadius: "10px", padding: "1.5rem" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "500", color: "#a04040", marginBottom: "6px" }}>Error</h3>
              <p style={{ fontSize: "13px", color: "#a04040" }}>{error}</p>
            </div>
          ) : recommendations ? (
            <div>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#1a1208", fontWeight: "normal", marginBottom: "1rem" }}>
                Your recommendations
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                {recommendations.map((book, index) => (
                  <div
                    key={index}
                    onClick={() => handleBookSelect(book)}
                    style={{ background: "#fff", border: "0.5px solid #e0d5c4", borderRadius: "10px", overflow: "hidden", display: "flex", cursor: "pointer", transition: "box-shadow 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(193,127,62,0.10)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <div style={{ width: "90px", minWidth: "90px", height: "130px", background: "#f3ede3", overflow: "hidden", flexShrink: 0 }}>
                      {book.cover ? (
                        <img
                          src={book.cover}
                          alt={book.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              const fallback = document.createElement("div")
                              fallback.style.width = "100%"
                              fallback.style.height = "100%"
                              fallback.style.backgroundColor = generateBookColor(book.title)
                              fallback.style.display = "flex"
                              fallback.style.alignItems = "center"
                              fallback.style.justifyContent = "center"
                              fallback.style.color = "white"
                              fallback.style.fontWeight = "bold"
                              fallback.style.fontSize = "1.1rem"
                              fallback.textContent = (book.title.charAt(0) + book.author.split(" ")[0].charAt(0)).toUpperCase()
                              parent.appendChild(fallback)
                            }
                          }}
                        />
                      ) : (
                        <BookCoverFallback title={book.title} author={book.author} />
                      )}
                    </div>
                    <div style={{ padding: "1rem", flex: 1 }}>
                      <h3 style={{ fontSize: "14px", fontWeight: "500", color: "#1a1208", marginBottom: "3px" }}>{book.title}</h3>
                      <p style={{ fontSize: "12px", color: "#c17f3e", marginBottom: "6px" }}>by {book.author}</p>
                      <p style={{ fontSize: "12px", color: "#6b5c42", lineHeight: "1.6" }}>{book.description}</p>
                      {book.publishedYear && (
                        <p style={{ fontSize: "11px", color: "#a8927a", marginTop: "6px" }}>Published {book.publishedYear}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: "#f3ede3", border: "0.5px solid #e0d5c4", borderRadius: "10px", padding: "3rem 2rem", textAlign: "center" }}>
              <svg width="36" height="36" viewBox="0 0 28 28" fill="none" style={{ margin: "0 auto 1rem" }}>
                <rect x="3" y="17" width="22" height="5" rx="1.5" fill="#c17f3e" opacity="0.4" />
                <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="#c17f3e" opacity="0.25" />
                <rect x="3" y="4" width="12" height="5" rx="1.5" fill="#c17f3e" opacity="0.15" />
              </svg>
              <p style={{ fontSize: "13px", color: "#8a7560", lineHeight: "1.65" }}>
                Describe what you enjoy and click "Get Recommendations" to see personalised book suggestions.
              </p>
            </div>
          )}
        </div>
      </div>

      <BookDetailsDialog book={selectedBook} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="add" />
    </div>
  )
}
