"use server"

import OpenAI from "openai"

// Generate a pastel background color based on title
function generateBookColor(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 80%)`
}

// Get book cover image URL from Google Books API with strict match
async function getBookCoverUrl(title: string, author: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${title} ${author}`)
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5&langRestrict=en`)

    if (!response.ok) throw new Error(`Google Books API error: ${response.status}`)

    const data = await response.json()
    if (!data.items || data.items.length === 0) return null

    const normalizedAuthorParts = author.toLowerCase().split(" ")

    // Strict match: language EN, has cover, and all words in GPT author name are in candidate author
    const strictMatch = data.items.find((item: any) => {
      const info = item.volumeInfo
      const authors = info.authors?.map((a: string) => a.toLowerCase()) || []
      const hasCover = info.imageLinks?.thumbnail

      const authorMatch = authors.some((candidate: string) =>
        normalizedAuthorParts.every((part) => candidate.includes(part))
      )

      return info.language === "en" && hasCover && authorMatch
    })

    if (strictMatch) return strictMatch.volumeInfo.imageLinks.thumbnail

    // Fallback: any English book with thumbnail
    const fallback = data.items.find(
      (item: any) => item.volumeInfo.language === "en" && item.volumeInfo.imageLinks?.thumbnail
    )

    return fallback ? fallback.volumeInfo.imageLinks.thumbnail : null
  } catch (error) {
    console.error("Error fetching book cover:", error)
    return null
  }
}

export async function getAIBookRecommendations(query: string) {
  try {
    console.log("📚 Starting AI book recommendation for query:", query)

    if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_PROJECT_ID) {
      throw new Error("OpenAI API key or Project ID is missing.")
    }

    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a literary expert who creates detailed book recommendations with comprehensive summaries.",
        },
        {
          role: "user",
          content: `
            Based on the following preferences, recommend 5 books with these details:
            - Title
            - Author
            - Description (400–500 characters)
            - Genre

            User preferences: ${query}

            Format the response as a JSON array with title, author, description, and genre.
            Do not include any text outside the JSON array.
          `,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }

    const apiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Project": `${process.env.OPENAI_PROJECT_ID}`,
      },
      body: JSON.stringify(payload),
    })

    if (!apiResponse.ok) {
      const errorDetails = await apiResponse.text()
      throw new Error(`OpenAI API call failed: ${errorDetails}`)
    }

    const response = await apiResponse.json()
    const responseText = response.choices[0]?.message?.content || ""
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    const jsonText = jsonMatch ? jsonMatch[0] : responseText
    const recommendations = JSON.parse(jsonText)

    const booksWithCovers = await Promise.all(
      recommendations.map(async (book: any, index: number) => {
        const coverUrl = await getBookCoverUrl(book.title, book.author)
        const initials = (
          book.title.charAt(0) + book.author.split(" ")[0].charAt(0)
        ).toUpperCase()

        return {
          id: `ai-rec-${index}`,
          title: book.title,
          author: book.author,
          description: book.description,
          genre: book.genre || "", 
          cover: coverUrl,
          fallbackColor: generateBookColor(book.title),
          initials,
        }
      })
    )

    // Deduplicate by cover or fallback
    const seen = new Set()
    const uniqueBooks = []

    for (const book of booksWithCovers) {
      const key = book.cover || `${book.initials}-${book.fallbackColor}`
      if (seen.has(key)) continue
      seen.add(key)
      uniqueBooks.push(book)
    }

    console.log(`✅ Returning ${uniqueBooks.length} final AI recommendations`)
    return uniqueBooks
  } catch (error) {
    console.error("❌ Error generating AI recommendations:", error)
    throw error
  }
}
