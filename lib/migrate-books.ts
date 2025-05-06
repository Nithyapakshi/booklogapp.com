"use client"

import { createClient } from "@supabase/supabase-js"

export async function migrateBooks() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  try {
    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.error("User must be logged in to migrate books")
      return { success: false, message: "User must be logged in to migrate books" }
    }

    // Get books from localStorage
    let localBooks = []
    try {
      const storedBooks = localStorage.getItem("booklog_offline_books")
      if (storedBooks) {
        localBooks = JSON.parse(storedBooks)
      }
    } catch (err) {
      console.error("Error reading from localStorage:", err)
    }

    if (!localBooks || localBooks.length === 0) {
      console.log("No local books found to migrate")
      return { success: true, message: "No books to migrate" }
    }

    console.log(`Found ${localBooks.length} books in localStorage to migrate`)

    // Filter books that don't have a user_id or have this user's ID
    const booksToMigrate = localBooks.filter((book) => !book.user_id || book.user_id === user.id)

    if (booksToMigrate.length === 0) {
      return { success: true, message: "No books to migrate for this user" }
    }

    // Add user_id to books that don't have it
    const preparedBooks = booksToMigrate.map((book) => ({
      ...book,
      user_id: user.id,
    }))

    // Insert books into Supabase
    const { error } = await supabase.from("books").upsert(preparedBooks)

    if (error) {
      console.error("Error migrating books to Supabase:", error)
      return { success: false, message: `Error migrating books: ${error.message}` }
    }

    // Clear localStorage after successful migration
    localStorage.removeItem("booklog_offline_books")

    return {
      success: true,
      message: `Successfully migrated ${booksToMigrate.length} books to your account`,
    }
  } catch (error) {
    console.error("Error during migration:", error)
    return {
      success: false,
      message: "Error during migration: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}
