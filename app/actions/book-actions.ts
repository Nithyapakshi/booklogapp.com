"use server"

import { searchBooks, getBookById, type BookSearchResult } from "@/lib/google-books-api"

export async function searchBooksAction(query: string): Promise<BookSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return []
  }

  try {
    const results = await searchBooks(query)
    return results
  } catch (error) {
    console.error("Error in searchBooksAction:", error)
    throw new Error("Failed to search books")
  }
}

export async function getBookByIdAction(id: string): Promise<BookSearchResult | null> {
  if (!id) {
    return null
  }

  try {
    const book = await getBookById(id)
    return book
  } catch (error) {
    console.error("Error in getBookByIdAction:", error)
    throw new Error("Failed to get book details")
  }
}
