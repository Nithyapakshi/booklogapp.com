// This file contains functions to search for books using the Google Books API
// and to get book details by ID

export interface BookSearchResult {
  id: string
  title: string
  author: string
  cover: string
  description?: string
  publishedYear?: number
  genre?: string // 
}

// Modify the searchBooks function to improve cover image fetching
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  try {
    // Add langRestrict=en to prefer English results
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=en`,
    )
    const data = await response.json()

    if (!data.items) return []

    // Only include books that are in English
    return data.items
      .filter((item: any) => item.volumeInfo.language === "en")
      .map((item: any) => ({
        id: item.id,
        title: item.volumeInfo.title || "Unknown Title",
        author: item.volumeInfo.authors ? item.volumeInfo.authors.join(", ") : "Unknown Author",
        cover: item.volumeInfo.imageLinks?.thumbnail,
        description: item.volumeInfo.description,
      }))
  } catch (error) {
    console.error("Error searching books:", error)
    return []
  }
}

// Also update the getBookById function to improve cover image fetching
export async function getBookById(id: string): Promise<BookSearchResult | null> {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}`)
    const item = await response.json()

    if (!item || !item.volumeInfo) return null

    // If this book is not in English, try to find an English version
    if (item.volumeInfo.language !== "en") {
      // Try to search for the same book in English
      const query = `intitle:${encodeURIComponent(item.volumeInfo.title)} inauthor:${encodeURIComponent(
        item.volumeInfo.authors?.[0] || "",
      )}`
      const englishResults = await searchBooks(query)

      // If we found an English version, return that instead
      if (englishResults.length > 0) {
        return englishResults[0]
      }

      // If no English version found, return null
      return null
    }

    return {
      id: item.id,
      title: item.volumeInfo.title || "Unknown Title",
      author: item.volumeInfo.authors ? item.volumeInfo.authors.join(", ") : "Unknown Author",
      cover: item.volumeInfo.imageLinks?.thumbnail,
      description: item.volumeInfo.description,
    }
  } catch (error) {
    console.error("Error getting book details:", error)
    return null
  }
}

// Function to get a book cover image URL from the Google Books API
async function getBookCoverUrl(title: string, author: string): Promise<string | null> {
  try {
    console.log(`Searching for cover for "${title}" by ${author}`)
    const query = encodeURIComponent(`${title} ${author}`)

    // Add langRestrict=en parameter to prefer English results
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5&langRestrict=en`)

    if (!response.ok) {
      console.error(`Google Books API error: ${response.status}`)
      return null // Return null on API error
    }

    const data = await response.json()
    console.log(`Found ${data.items?.length || 0} results for "${title}"`)

    // If we have results, try to find a book with a cover image (not necessarily English)
    if (data.items && data.items.length > 0) {
      // First try to find an English book with a cover
      const englishBook = data.items.find(
        (item: any) =>
          item.volumeInfo.language === "en" && item.volumeInfo.imageLinks && item.volumeInfo.imageLinks.thumbnail,
      )

      if (englishBook) {
        console.log(`Found English edition with cover for "${title}"`)
        return englishBook.volumeInfo.imageLinks.thumbnail
      }

      // If no English book with cover, try any book with a cover
      const anyBookWithCover = data.items.find(
        (item: any) => item.volumeInfo.imageLinks && item.volumeInfo.imageLinks.thumbnail,
      )

      if (anyBookWithCover) {
        console.log(`Found non-English edition with cover for "${title}"`)
        return anyBookWithCover.volumeInfo.imageLinks.thumbnail
      }
    }

    console.log(`No cover found for "${title}"`)
    return null
  } catch (error) {
    console.error("Error fetching book cover:", error)
    return null // Return null on any error
  }
}
