export interface BookSearchResult {
  id: string
  title: string
  author: string
  cover: string
  genre?: string
  description?: string
  publishedYear?: number
}

// Function to clean text from HTML tags and special characters
function cleanText(text: string): string {
  if (!text) return ""

  try {
    // First remove HTML tags
    let cleaned = text.replace(/<\/?[^>]+(>|$)/g, " ")

    // Replace common problematic characters
    cleaned = cleaned.replace(/\*/g, " ")
    cleaned = cleaned.replace(/\n/g, " ")
    cleaned = cleaned.replace(/\r/g, " ")
    cleaned = cleaned.replace(/\t/g, " ")

    // Fix common formatting issues
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between camelCase

    // Replace multiple spaces with a single space
    cleaned = cleaned.replace(/\s+/g, " ")

    // Fix specific patterns
    cleaned = cleaned.replace(/Bestseller More/g, "Bestseller. More")
    cleaned = cleaned.replace(/sold One/g, "sold. One")
    cleaned = cleaned.replace(/year Selected/g, "year. Selected")

    return cleaned.trim()
  } catch (error) {
    console.error("Error cleaning text:", error)
    return text || ""
  }
}

function normaliseGenre(categories: string[] | undefined): string {
  if (!categories || categories.length === 0) return "General"
  const raw = categories[0].toLowerCase()
  if (raw.includes("fiction") && !raw.includes("non")) return "Fiction"
  if (raw.includes("non-fiction") || raw.includes("nonfiction")) return "Non-fiction"
  if (raw.includes("biograph") || raw.includes("memoir")) return "Biography"
  if (raw.includes("histor")) return "History"
  if (raw.includes("business") || raw.includes("econom") || raw.includes("finance")) return "Business"
  if (raw.includes("science") || raw.includes("technology") || raw.includes("nature")) return "Science"
  if (raw.includes("self-help") || raw.includes("self help") || raw.includes("personal development") || raw.includes("body, mind") || raw.includes("psychology")) return "Self-help"
  if (raw.includes("mystery") || raw.includes("thriller") || raw.includes("crime")) return "Mystery & Thriller"
  if (raw.includes("fantasy") || raw.includes("sci-fi") || raw.includes("science fiction") || raw.includes("speculative")) return "Fantasy & Sci-fi"
  if (raw.includes("romance") || raw.includes("love")) return "Romance"
  if (raw.includes("child") || raw.includes("juvenile") || raw.includes("young adult") || raw.includes("ya")) return "Children's"
  if (raw.includes("philosoph") || raw.includes("religion") || raw.includes("spiritual")) return "Philosophy"
  return "General"
}

export function rankSearchResults(query: string, books: BookSearchResult[]): BookSearchResult[] {
  const normalise = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
  const baseTitle = (s: string) => normalise(s.split(":")[0].replace(/\s*\([^)]*(?:edition|anniversary)[^)]*\)\s*/gi, ""))
  const q = normalise(query)
  if (!q) return []
  const words = q.split(" ")
  const ranked = books.map((book, index) => {
    const title = normalise(book.title), base = baseTitle(book.title), author = normalise(book.author)
    const haystack = (title + " " + author).split(" ")
    const coverage = words.filter(w => haystack.some(t => t === w || (w.length >= 3 && t.startsWith(w)))).length / words.length
    const exactTitle = title === q || base === q
    const exactAuthor = author === q
    const phrase = title.includes(q) || author.includes(q)
    const score = exactTitle ? 120 : exactAuthor ? 110 : phrase ? 85 : Math.round(coverage * 70)
    return { book, index, score, coverage, quality: Number(!!book.cover) * 4 + Number(!!book.description) * 2 + Number(!!book.publishedYear) }
  }).filter(x => x.score >= 55 && x.coverage >= 0.75)
  const hasExactAuthor = ranked.some(x => x.score === 110)
  const hasExactTitle = !hasExactAuthor && ranked.some(x => x.score === 120)
  const finalists = ranked.filter(x => hasExactTitle ? x.score === 120 : hasExactAuthor ? x.score === 110 : true)
  const unique = new Map<string, typeof ranked[number]>()
  for (const result of finalists) {
    const key = baseTitle(result.book.title) + (hasExactTitle ? "" : "|" + normalise(result.book.author))
    const prev = unique.get(key)
    if (!prev || result.score > prev.score || (result.score === prev.score && normalise(result.book.author) === normalise(prev.book.author) && result.quality > prev.quality)) unique.set(key, result)
  }
  const sorted = [...unique.values()].sort((a,b) => b.score-a.score || a.index-b.index)
  const cutoff = sorted.length ? Math.max(55, sorted[0].score - 25) : 55
  return sorted.filter(x => x.score >= cutoff).slice(0,5).map(x => x.book)
}

// Google Books intermittently answers 503 (and occasionally 429). Retry those a few times
// before giving up so a single bad response does not surface as "Search is unavailable".
async function fetchWithRetry(url: string, attempts = 6): Promise<Response> {
  let last: Response | undefined
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok || (res.status < 500 && res.status !== 429)) return res
      last = res
    } catch (error) {
      if (i === attempts - 1) throw error
    }
    await new Promise((r) => setTimeout(r, 300 * (i + 1)))
  }
  return last as Response
}

// Function to search for books
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query.trim()) return []
  try {
    const response = await fetchWithRetry(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&orderBy=relevance&printType=books&key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`,
    )

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.items || !Array.isArray(data.items)) {
      return []
    }

    const books = data.items.map((item: any) => ({
      id: item.id,
      title: item.volumeInfo.title || "Unknown Title",
      author: item.volumeInfo.authors ? item.volumeInfo.authors.join(", ") : "Unknown Author",
      cover: item.volumeInfo.imageLinks?.thumbnail || "",
      description: cleanText(item.volumeInfo.description || ""),
      publishedYear: item.volumeInfo.publishedDate
        ? Number.parseInt(item.volumeInfo.publishedDate.substring(0, 4))
        : undefined,
      genre: normaliseGenre(item.volumeInfo.categories),
    }))
    return rankSearchResults(query, books)
  } catch (error) {
    throw error instanceof Error ? error : new Error("Book search failed")
  }
}

// Function to get a book by ID
export async function getBookById(id: string): Promise<BookSearchResult | null> {
  try {
    const response = await fetchWithRetry(`https://www.googleapis.com/books/v1/volumes/${id}?key=${process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY}`)

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`)
    }

    const item = await response.json()

    if (!item || !item.volumeInfo) {
      return null
    }

    return {
      id: item.id,
      title: item.volumeInfo.title || "Unknown Title",
      author: item.volumeInfo.authors ? item.volumeInfo.authors.join(", ") : "Unknown Author",
      cover: item.volumeInfo.imageLinks?.thumbnail || "",
      description: cleanText(item.volumeInfo.description || ""),
      publishedYear: item.volumeInfo.publishedDate
        ? Number.parseInt(item.volumeInfo.publishedDate.substring(0, 4))
        : undefined,
      genre: normaliseGenre(item.volumeInfo.categories),
    }
  } catch (error) {
    console.error("Error getting book by ID:", error)
    return null
  }
}
