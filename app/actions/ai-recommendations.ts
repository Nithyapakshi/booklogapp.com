"use server"

import Anthropic from "@anthropic-ai/sdk"

// Function to get a book cover image URL from the Google Books API
async function getBookCoverUrl(title: string, author: string): Promise<string> {
  try {
    const query = encodeURIComponent(`${title} ${author}`)
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`)

    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.items && data.items.length > 0 && data.items[0].volumeInfo.imageLinks) {
      // Return the thumbnail image URL
      return data.items[0].volumeInfo.imageLinks.thumbnail
    }

    // If no image is found, return null
    // The UI will handle displaying a fallback for null cover values
    return ""
  } catch (error) {
    console.error("Error fetching book cover:", error)
    // Return empty string to indicate no cover was found
    return ""
  }
}

export async function getAIBookRecommendations(query: string) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Anthropic API key is missing. Please add it to your environment variables.")
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: "claude-opus-4-5-20251101",
      max_tokens: 2000,
      system: "You are a literary expert who creates detailed book recommendations with comprehensive summaries.",
      messages: [
        {
          role: "user",
          content: `Based on the following preferences, recommend 5 books with these details:
- Title
- Author
- Description (400–500 characters)
- Genre

User preferences: ${query}

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
        recommendations.map(async (book: any, index: number) => {
          // Get a cover image URL for the book
          const coverUrl = await getBookCoverUrl(book.title, book.author)

          return {
            ...book,
            id: `ai-rec-${index}`,
            cover: coverUrl,
          }
        }),
      )

      return booksWithCovers
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError)
      console.log("Raw response:", responseText)
      throw new Error("Failed to parse AI recommendations")
    }
  } catch (error) {
    console.error("Error getting AI recommendations:", error)
    throw error
  }
}
