"use server"

import Anthropic from "@anthropic-ai/sdk"

// Function to get a book cover image URL and Google Books ID
async function getBookCoverUrl(title: string, author: string): Promise<{ cover: string; googleId: string }> {
  try {
    const query = encodeURIComponent(`${title} ${author}`)
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10&key=${process.env.GOOGLE_BOOKS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
    // Google Books intermittently answers 503/429; retry a few times so covers are not lost to one bad response.
    // Each cover lookup gets about 2 seconds in total, so a slow Google never holds up the recommendations.
    const deadline = Date.now() + 2000
    const get = () => fetch(url, { signal: AbortSignal.timeout(Math.max(deadline - Date.now(), 200)) })
    let response = await get()
    for (let attempt = 1; attempt < 4 && (response.status === 503 || response.status === 429 || response.status >= 500) && Date.now() + 400 * attempt < deadline; attempt++) {
      await new Promise((r) => setTimeout(r, 400 * attempt))
      response = await get()
    }

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.items && data.items.length > 0) {
      // Several editions of the same title come back; use the newest edition of THIS book (same title and author),
      // preferring one that has a cover. Fall back to the first hit when nothing matches cleanly.
      const norm = (v: string) => (v || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
      const base = (v: string) => norm(String(v || "").split(":")[0].replace(/\([^)]*\)/g, ""))
      const wantTitle = base(title), wantAuthors = norm(author).split(" ").filter((w) => w.length > 2)
      const matches = data.items.filter((it: any) => {
        const info = it.volumeInfo || {}
        const authors = norm((info.authors || []).join(" "))
        return base(info.title) === wantTitle && (!wantAuthors.length || wantAuthors.some((w) => authors.includes(w)))
      })
      const year = (it: any) => Number.parseInt(String(it.volumeInfo?.publishedDate || "").slice(0, 4)) || 0
      const pool = matches.length ? matches : [data.items[0]]
      const item = [...pool].sort((a: any, b: any) =>
        Number(!!b.volumeInfo?.imageLinks?.thumbnail) - Number(!!a.volumeInfo?.imageLinks?.thumbnail) || year(b) - year(a))[0]
      return {
        cover: item.volumeInfo.imageLinks?.thumbnail ?? "",
        googleId: item.id ?? "",
      }
    }

    return { cover: "", googleId: "" }
  } catch (error) {
    console.error("Error fetching book cover:", error)
    return { cover: "", googleId: "" }
  }
}

export async function getAIBookRecommendations(query: string, exclude: string[] = [], count: number = 5) {
  const howMany = Math.min(Math.max(Math.floor(Number(count)) || 5, 1), 15)
  try {
    if (process.env.VERCEL_ENV === "preview") throw new Error("AI recommendations are disabled in the test preview.")
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Anthropic API key is missing. Please add it to your environment variables.")
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: howMany > 5 ? 4096 : 1024,
      system: "You are a literary expert who creates detailed book recommendations with comprehensive summaries.",
      messages: [
        {
          role: "user",
          content: `Based on the following preferences, recommend ${howMany} books with these details:
- Title
- Author
- Description (2-3 sentences max, well-written, capturing the essence of the book)
- Genre

User preferences: ${query}
${exclude.length ? `\nDo not recommend any of these books, the user has already seen them: ${exclude.slice(0, 60).map((t) => String(t).slice(0, 120)).join('; ')}\n` : ''}

Format the response as a JSON array with title, author, description, and genre.
Do not include any text outside the JSON array.`,
        },
      ],
    })

    const responseText = message.content[0]?.type === "text" ? message.content[0].text : ""

    // Parse the JSON response
    try {
      // Find the JSON part of the response (in case there's any extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      const jsonText = jsonMatch ? jsonMatch[0] : responseText

      const recommendations = JSON.parse(jsonText)

      // Add IDs and fetch cover images for each book
      const booksWithCovers = await Promise.all(
        recommendations.map(async (book: any) => {
          const { cover, googleId } = await getBookCoverUrl(book.title, book.author)
          const stableId = googleId || `ai-rec-${book.title}-${book.author}`.replace(/\s+/g, '-').toLowerCase()
          return { ...book, id: stableId, cover }
        }),
      )

      return booksWithCovers
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError)
      console.log("Raw response:", responseText)
      throw new Error("Failed to parse AI recommendations")
    }
  } catch (error) {
    console.error("Error getting AI recommendations:", error instanceof Error ? error.message : String(error), error)
    throw error
  }
}
