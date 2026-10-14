"use server"

import Anthropic from "@anthropic-ai/sdk"

// Function to get a book cover image URL and Google Books ID
// Fixture simulates Google unavailable, exercising the real Open Library fallback.
async function googleBookCover(title: string, author: string): Promise<{cover:string;googleId:string}> {
  return {cover: "", googleId: ""}
}

const normText = (v: string) => (v || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()

// Free fallback when Google has no cover or its quota is used up. Only accepts a hit whose title and author match.
async function openLibraryCover(title: string, author: string): Promise<string> {
  try {
    const q = `title:"${title.replace(/"/g, "")}" author:"${author.replace(/"/g, "")}" language:eng`
    const u = new URLSearchParams({ q, lang: "en", limit: "5", fields: "key,title,author_name,editions,editions.key,editions.title,editions.language,editions.cover_i" })
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
      // Genre and mood requests remain taste even when phrased "books about ...".
      // Explicit subject requests still need a literal mention; this is a conservative guard.
      const isTaste = !!subject && /^(?:(?:dark|literary|uplifting|heartwarming|feel good|character driven|slow burn|historical|psychological|gothic|romantic|dystopian|contemporary|epic|cozy)\s+)*(?:fiction|novels?|romance|fantasy|thrillers?|mystery|horror|sci fi|science fiction|magical realism)$/i.test(normText(subject))
      const subjectWords = subject && !isTaste ? normText(subject).split(" ").filter(w => !["the", "a", "an"].includes(w)) : []
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
