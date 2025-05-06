import { NextResponse } from "next/server"
import OpenAI from "openai"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export async function POST(request: Request) {
  try {
    const { bookId, title, author, description } = await request.json()

    // Validate required fields
    if (!title || !author) {
      return NextResponse.json({ error: "Missing required fields: title and author are required" }, { status: 400 })
    }

    // Check if we have an OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing. Please add it to your environment variables." },
        { status: 500 },
      )
    }

    // Check if description is too short to summarize
    if (!description || description.length < 100) {
      return NextResponse.json({ error: "Description is too short to summarize" }, { status: 400 })
    }

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

    // Call the OpenAI API with GPT-4o for better quality summaries
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using GPT-4o for higher quality summaries
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
      max_tokens: 300, // Limiting token usage
    })

    // Extract the summary
    const summary = response.choices[0]?.message?.content?.trim() || null

    if (!summary) {
      return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 })
    }

    // If we have a bookId, save the summary to the database
    if (bookId) {
      try {
        const supabase = createClientSupabaseClient()
        await supabase.from("books").update({ ai_summary: summary }).eq("id", bookId)
      } catch (dbError) {
        console.error("Error saving summary to database:", dbError)
        // Continue even if saving to DB fails
      }
    }

    return NextResponse.json({ summary })
  } catch (error) {
    console.error("Error in generate-summary API route:", error)
    return NextResponse.json({ error: "An error occurred while generating the summary" }, { status: 500 })
  }
}
