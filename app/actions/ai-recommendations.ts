"use server"

import Anthropic from "@anthropic-ai/sdk"

// Function to get a book cover image URL and Google Books ID
async function googleBookCover(title: string, author: string): Promise<{ cover: string; googleId: string }> {
  try {
    const query = encodeURIComponent(`${title} ${author}`)
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=10&key=${process.env.GOOGLE_BOOKS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`
    // Google Books intermittently answers 503; retry a few times. A 429 is the daily quota, so retrying is pointless: give up and let Open Library answer.
    // Each cover lookup gets about 2 seconds in total, so a slow Google never holds up the recommendations.
    const deadline = Date.now() + 2000
    const get = () => fetch(url, { signal: AbortSignal.timeout(Math.max(deadline - Date.now(), 200)) })
    let response = await get()
    for (let attempt = 1; attempt < 4 && (response.status === 503 || response.status >= 500) && Date.now() + 400 * attempt < deadline; attempt++) {
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
        return base(info.title) === wantTitle && (!wantAuthors.length || wantAuthors.every((w) => authors.split(" ").includes(w)))
      })
      const year = (it: any) => Number.parseInt(String(it.volumeInfo?.publishedDate || "").slice(0, 4)) || 0
      const pool = matches
      if (!pool.length) return { cover: "", googleId: "" }
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

const normText = (v: string) => (v || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()

// Free fallback when Google has no cover or its quota is used up. Only accepts a hit whose title and author match.
async function openLibraryCover(title: string, author: string): Promise<string> {
  try {
    const u = new URLSearchParams({ title, author, limit: "5", fields: "title,author_name,cover_i" })
    const res = await fetch(`https://openlibrary.org/search.json?${u}`, { signal: AbortSignal.timeout(2500) })
    if (!res.ok) return ""
    const docs: any[] = (await res.json()).docs || []
    const base = (v: string) => normText(String(v || "").split(":")[0].replace(/\([^)]*\)/g, ""))
    const wantAuthors = normText(author).split(" ").filter((w) => w.length > 2)
    const hit = docs.find((d) => d.cover_i && base(d.title) === base(title) && (!wantAuthors.length || wantAuthors.every((w) => normText((d.author_name || []).join(" ")).split(" ").includes(w))))
    return hit ? `https://covers.openlibrary.org/b/id/${hit.cover_i}-M.jpg` : ""
  } catch {
    return ""
  }
}

async function getBookCoverUrl(title: string, author: string): Promise<{ cover: string; googleId: string }> {
  const g = await googleBookCover(title, author)
  if (g.cover) return g
  return { cover: await openLibraryCover(title, author), googleId: g.googleId }
}

export async function getAIBookRecommendations(query: string, exclude: string[] = [], count: number = 5) {
  const howMany = Math.min(Math.max(Math.floor(Number(count)) || 5, 1), 15)
  try {
    // TEST-ONLY branch. This file must never merge to main.
    if (process.env.VERCEL_ENV !== "preview") throw new Error("Fixture branch only runs in preview")
    const fixture = /bezos/i.test(query) ? [
      {title: "The Everything Store", author: "Brad Stone", description: "The story of Jeff Bezos and Amazon.", genre: "Business", on_topic: true},
      {title: "Amazon Unbound", author: "Brad Stone", description: "Jeff Bezos builds Amazon into an empire.", genre: "Business", on_topic: true},
      {title: "Steve Jobs", author: "Walter Isaacson", description: "The story of Apple's founder.", genre: "Biography", on_topic: true},
      {title: "Shoe Dog", author: "Phil Knight", description: "The story of Nike's founder.", genre: "Memoir", on_topic: false}
    ] : [
      {title: "The Secret History", author: "Donna Tartt", description: "A bleak literary story of friendship, guilt and consequences.", genre: "Fiction", on_topic: true},
      {title: "Never Let Me Go", author: "Kazuo Ishiguro", description: "A restrained literary story of friendship, memory and loss.", genre: "Fiction", on_topic: true}
    ]
    const message = {content: [{type: "text", text: JSON.stringify(fixture)}]}

    const responseText = message.content[0]?.type === "text" ? message.content[0].text : ""

    // Parse the JSON response
    try {
      // Find the JSON part of the response (in case there's any extra text)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      const jsonText = jsonMatch ? jsonMatch[0] : responseText

      // Drop anything the model itself marked as off-topic, and strip the flag before returning.
      const parsed = JSON.parse(jsonText)
      if (!Array.isArray(parsed)) throw new Error("AI response is not a list")
      // An explicit "about X" request must mention X in title or description as well.
      // Taste/mood queries do not use this subject gate.
      const subject = query.match(/\b(?:books?\s+)?(?:about|on)\s+(.+?)[.!?]*$/i)?.[1]?.trim()
      const subjectWords = subject ? normText(subject).split(" ").filter(w => !["the", "a", "an"].includes(w)) : []
      const recommendations = parsed
        .filter((b: any) => b && typeof b.title === "string" && typeof b.author === "string" && b.on_topic === true)
        .filter((b: any) => !subjectWords.length || subjectWords.every(w => normText(`${b.title} ${b.description || ""}`).split(" ").includes(w)))
        .slice(0, howMany)
        .map(({ on_topic, ...book }: any) => book)

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
