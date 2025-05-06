export interface Book {
  id: string
  title: string
  author: string
  cover?: string
  cover_url?: string // Add this field to match the database schema
  status: BookStatus
  description?: string
  genre?: string
  amazonRating?: number // ✅ Use camelCase
  selfRating?: number
  recommendedBy?: string
  rating?: number
  user_id: string
  notes?: string
  startDate?: string
  finishDate?: string
  currentPage?: number
  totalPages?: number
}

export interface BookSearchResult {
  id: string
  title: string
  author: string
  cover: string
  cover_url?: string // Add this field to match the database schema
  description?: string
  genre?: string
  user_id?: string
}

export type BookStatus = "reading" | "queued" | "completed" | "recommended" | "onHold"
