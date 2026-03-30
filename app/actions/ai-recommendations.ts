"use server"

import OpenAI from "openai"

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
    // Check if we have an OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is missing. Please add it to your environment variables.")
    }

    // Initialize the OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Create a prompt for book recommendations
    const prompt = `
      Based on the following preferences, recommend 3 books with these details for each:
      - Title
      - Author
      - Brief description (1-2 sentences)
      - Published year (if known)
      - Genre

      User preferences: ${query}

      Format the response as a JSON array with objects containing title, author, description, publishedYear, and genre fields.
      Do not include any explanations or text outside of the JSON array.
    `

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that recommends books based on user preferences.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    })

    // Extract the response text
    const responseText = response.choices[0]?.message?.content || ""

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
      console.error("Failed to parse OpenAI response:", parseError)
      console.log("Raw response:", responseText)
      throw new Error("Failed to parse AI recommendations")
    }
  } catch (error) {
    console.error("Error getting AI recommendations:", error)
    throw error
  }
}
