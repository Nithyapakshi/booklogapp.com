import type { Book } from "@/types"

// Extended Book type with sync information
export interface SyncedBook extends Book {
  synced?: boolean
  lastSynced?: string
  syncError?: string
}

// Simple service that doesn't actually implement syncing
export class BookService {
  static async fetchUserBooks(): Promise<SyncedBook[]> {
    return []
  }

  static async saveBook(book: Book): Promise<void> {}

  static async deleteBook(bookId: string): Promise<void> {}

  static async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {}
}
