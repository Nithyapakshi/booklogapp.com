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
    const q = `title:"${title.replace(/"/g, "")}" author:"${author.replace(/"/g, "")}" language:eng`
    const u = new URLSearchParams({ q, lang: "en", limit: "5", fields: "title,author_name,editions,editions.title,editions.language,editions.cover_i" })
    const res = await fetch(`https://openlibrary.org/search.json?${u}`, { signal: AbortSignal.timeout(2500) })
    if (!res.ok) return ""
    const docs: any[] = (await res.json()).docs || []
    const base = (v: string) => normText(String(v || "").split(":")[0].replace(/\([^)]*\)/g, ""))
    const wantAuthors = normText(author).split(" ").filter((w) => w.length > 2)
    for (const d of docs) {
      if (base(d.title) !== base(title) || !wantAuthors.length || !wantAuthors.every(w => normText((d.author_name || []).join(" ")).split(" ").includes(w))) continue
      const edition = (d.editions?.docs || []).find((e: any) => e.cover_i && base(e.title) === base(title) && Array.isArray(e.language) && e.language.includes("eng"))
      if (edition) return `https://covers.openlibrary.org/b/id/${edition.cover_i}-M.jpg`
    }
    return ""
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
    if (process.env.VERCEL_ENV === "preview") throw new Error("AI recommendations are disabled in the test preview.")
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Anthropic API key is missing. Please add it to your environment variables.")
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: howMany > 5 ? 4096 : 1024,
      system: "You are a literary expert who creates accurate book recommendations. You never pad a list with loosely related books.",
      messages: [
        {
          role: "user",
          content: `Recommend up to ${howMany} books for the request below.

How to read the request:
- If it names a person, company, event or topic ("books about X"), recommend only books that are directly ABOUT that subject (biographies, histories, accounts of it). Do not recommend books about other people or companies, even similar ones, and do not recommend what readers of such books also like.
- If it describes a taste, mood or a book the reader liked, recommend books that truly match its themes, tone and style.
- Return fewer books rather than padding the list with weak matches. Every book must be a real, published book.

For each book give:
- title
- author
- description (2-3 sentences max, well-written, capturing the essence of the book)
- genre
- on_topic: true only if the book is directly about the named subject, or genuinely matches the described taste; otherwise false

Request: ${query}
${exclude.length ? `\nDo not recommend any of these books, the user has already seen them: ${exclude.slice(0, 60).map((t) => String(t).slice(0, 120)).join('; ')}\n` : ''}

Format the response as a JSON array of objects with title, author, description, genre and on_topic.
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
