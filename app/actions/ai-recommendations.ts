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

// Free fallback. Identity is checked on an English edition, not the work's canonical title.
async function openLibraryCover(title: string, author: string): Promise<string> {
  const deadline = Date.now() + 4000
  let requests = 0
  const authorCache = new Map<string, Promise<boolean>>()
  const base = (v: string) => normText(String(v || '').split(':')[0].replace(/\([^)]*\)/g, ''))
  const authorWords = normText(author).split(' ').filter(w => w.length > 2)
  const matchesAuthor = (v: string) => authorWords.length > 0 && authorWords.every(w => normText(v).split(' ').includes(w))
  const read = async (path: string): Promise<any | null> => {
    if (++requests > 12 || Date.now() >= deadline) return null
    try {
      const res = await fetch(`https://openlibrary.org${path}`, {signal: AbortSignal.timeout(Math.max(1, deadline - Date.now()))})
      return res.ok ? await res.json() : null
    } catch { return null }
  }
  const authorIdMatches = (key: string): Promise<boolean> => {
    if (!/^\/authors\/OL\d+A$/.test(key)) return Promise.resolve(false)
    if (!authorCache.has(key)) authorCache.set(key, read(`${key}.json`).then(a => !!a && [a.name, ...(Array.isArray(a.alternate_names) ? a.alternate_names : [])].some(n => typeof n === 'string' && matchesAuthor(n))))
    return authorCache.get(key)!
  }
  const editionCover = async (e: any, d: any): Promise<string> => {
    if (!e || base(e.title) !== base(title)) return ''
    const languages = Array.isArray(e.languages) ? e.languages.map((l: any) => l?.key?.split('/').pop()) : e.language
    const cover = Array.isArray(e.covers) ? e.covers.find((n: any) => Number.isSafeInteger(n) && n > 0) : e.cover_i
    if (!Array.isArray(languages) || !languages.includes('eng') || !Number.isSafeInteger(cover) || cover <= 0) return ''
    // A full edition's author IDs take precedence over a work-level display name.
    if (Array.isArray(e.authors) && e.authors.length > 0) {
      const ids = e.authors.slice(0, 4).map((a: any) => a?.key || a?.author?.key)
      if (!(await Promise.all(ids.map(authorIdMatches))).some(Boolean)) return ''
    } else if (!(d.author_name || []).some(matchesAuthor)) {
      const ids = (d.author_key || []).slice(0, 4).map((k: string) => `/authors/${k}`)
      if (!(await Promise.all(ids.map(authorIdMatches))).some(Boolean)) return ''
    }
    return `https://covers.openlibrary.org/b/id/${cover}-M.jpg`
  }
  const fields = 'key,title,author_name,author_key,editions,editions.key,editions.title,editions.language,editions.cover_i'
  const inspect = async (docs: any[]): Promise<string> => {
    for (const d of docs.slice(0, 5)) {
      for (const e of (d.editions?.docs || []).slice(0, 5)) {
        const cover = await editionCover(e, d)
        if (cover) return cover
      }
      // The search embeds only its first edition. Look beyond it only after binding the author.
      const known = (d.author_name || []).some(matchesAuthor) || (await Promise.all((d.author_key || []).slice(0, 4).map((k: string) => authorIdMatches(`/authors/${k}`)))).some(Boolean)
      if (!known || !/^\/works\/OL\d+W$/.test(d.key)) continue
      const editions = await read(`${d.key}/editions.json?limit=100`)
      for (const e of (editions?.entries || []).slice(0, 100)) {
        const cover = await editionCover(e, d)
        if (cover) return cover
      }
    }
    return ''
  }
  try {
    const q = `title:"${title.replace(/"/g, '')}" author:"${author.replace(/"/g, '')}" language:eng`
    const exact = await read(`/search.json?${new URLSearchParams({q, lang:'en', limit:'5', fields})}`)
    const found = await inspect(exact?.docs || [])
    if (found) return found
    // A transliterated author can be absent from search's display name. Resolve aliases by ID.
    const broad = await read(`/search.json?${new URLSearchParams({title, lang:'en', limit:'5', fields})}`)
    return await inspect(broad?.docs || [])
  } catch { return '' }
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
- Mood/genre phrases such as "books about dark literary fiction" are taste requests, not named subjects.
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
      const requestText = query.split(/[.!?]\s+(?=(?:give|include|exclude|avoid|do not|don't|return|show|provide|explain|list|limit|use|please)\b)/i)[0].trim()
      const subject = requestText.match(/\b(?:books?\s+)?(?:about|on)\s+(.+?)[.!?]*$/i)?.[1]?.trim()
      // Genre and mood requests remain taste even when phrased "books about ...".
      // Explicit subject requests still need a literal mention; this is a conservative guard.
      const isTaste = !!subject && /^(?:(?:dark|literary|uplifting|heartwarming|feel good|character driven|slow burn|historical|psychological|gothic|romantic|dystopian|contemporary|epic|cozy)\s+)*(?:fiction|novels?|romance|fantasy|thrillers?|mystery|horror|comedy|humor|humour|sci fi|science fiction|magical realism)$/i.test(normText(subject))
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
