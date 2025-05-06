import type { Book } from "@/types"
import type { SyncedBook } from "./book-service"

// Define database structure
interface SyncOperation {
  id: string
  operation: "add" | "update" | "delete"
  book: Book
  timestamp: number
  retryCount: number
}

export class IndexedDBService {
  private dbName = "booklogDB"
  private dbVersion = 1
  private db: IDBDatabase | null = null

  // Initialize the database
  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = (event) => {
        console.error("IndexedDB error:", event)
        reject("Could not open IndexedDB")
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create books store
        if (!db.objectStoreNames.contains("books")) {
          const booksStore = db.createObjectStore("books", { keyPath: "id" })
          booksStore.createIndex("status", "status", { unique: false })
          booksStore.createIndex("synced", "synced", { unique: false })
        }

        // Create sync operations store
        if (!db.objectStoreNames.contains("syncOperations")) {
          const syncStore = db.createObjectStore("syncOperations", { keyPath: "id" })
          syncStore.createIndex("timestamp", "timestamp", { unique: false })
        }
      }
    })
  }

  // Save a book to IndexedDB
  async saveBook(book: SyncedBook): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["books"], "readwrite")
      const store = transaction.objectStore("books")

      const request = store.put(book)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Get all books
  async getAllBooks(): Promise<SyncedBook[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["books"], "readonly")
      const store = transaction.objectStore("books")

      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Get books by status
  async getBooksByStatus(status: string): Promise<SyncedBook[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["books"], "readonly")
      const store = transaction.objectStore("books")
      const index = store.index("status")

      const request = index.getAll(status)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Delete a book
  async deleteBook(id: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["books"], "readwrite")
      const store = transaction.objectStore("books")

      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Add a sync operation
  async addSyncOperation(operation: SyncOperation): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["syncOperations"], "readwrite")
      const store = transaction.objectStore("syncOperations")

      const request = store.put(operation)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Get pending sync operations
  async getPendingSyncOperations(): Promise<SyncOperation[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["syncOperations"], "readonly")
      const store = transaction.objectStore("syncOperations")

      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Remove a sync operation
  async removeSyncOperation(id: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["syncOperations"], "readwrite")
      const store = transaction.objectStore("syncOperations")

      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

// Create a singleton instance
export const indexedDBService = new IndexedDBService()
