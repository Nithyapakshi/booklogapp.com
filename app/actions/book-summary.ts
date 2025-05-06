import { createClientSupabaseClient } from "@/lib/supabase/client"
import OpenAI from "openai"

export async function getBookSummary(
  bookId: string,
  title: string,
  author: string,
  description: string,
): Promise<string | null> {
  try {
    // First check if we already have a summary in the database
    if (bookId) {
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase.from("books").select("ai_summary").eq("id", bookId).single()

      if (!error && data?.ai_summary) {
        console.log("Using cached book summary from database for:", title)
        return data.ai_summary
      }
    }

    // Check if we have an OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn("OpenAI API key is missing. Cannot generate summary for:", title)
      return null
    }

    // Check if description is too short to summarize
    if (!description || description.length < 100) {
      console.warn("Description too short to summarize for:", title)
      return null
    }

    console.log("Generating new AI summary for:", title)

    // Initialize the OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Create a prompt for the book summary
    const prompt = `
      Please provide a concise 8-10 line summary of the following book:
      
      Title: ${title}
      Author: ${author}
      Description: ${description.substring(0, 1000)} ${description.length > 1000 ? "..." : ""}
      
      Your summary should:
      - Be approximately 8-10 lines (400-500 characters)
      - Capture the main themes and concepts of the book
      - Be written in clear, engaging language
      - End with a complete sentence (no trailing ellipsis)
      
      Summary:
    `

    // Call the OpenAI API with GPT-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a literary expert who creates concise, informative book summaries.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    // Extract the summary
    const summary = response.choices[0]?.message?.content?.trim() || null

    // If we have a bookId and a summary, save it to the database
    if (bookId && summary && typeof summary === "string") {
      const supabase = createClientSupabaseClient()
      await supabase.from("books").update({ ai_summary: summary }).eq("id", bookId)
      console.log("Saved new AI summary to database for:", title)
    }

    return summary
  } catch (error) {
    console.error("Error generating book summary:", error)
    return null
  }
}
