export interface BookSearchResult {
  id: string
  title: string
  author: string
  cover: string
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

// Function to search for books
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`,
    )

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.items || !Array.isArray(data.items)) {
      return []
    }

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.volumeInfo.title || "Unknown Title",
      author: item.volumeInfo.authors ? item.volumeInfo.authors.join(", ") : "Unknown Author",
      cover: item.volumeInfo.imageLinks?.thumbnail || "",
      description: cleanText(item.volumeInfo.description || ""),
      publishedYear: item.volumeInfo.publishedDate
        ? Number.parseInt(item.volumeInfo.publishedDate.substring(0, 4))
        : undefined,
    }))
  } catch (error) {
    console.error("Error searching books:", error)
    return []
  }
}

// Function to get a book by ID
export async function getBookById(id: string): Promise<BookSearchResult | null> {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}`)

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
    }
  } catch (error) {
    console.error("Error getting book by ID:", error)
    return null
  }
}
