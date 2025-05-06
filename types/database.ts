// Database types that match your Supabase schema
export interface DbBook {
  id: string
  created_at?: string
  title: string
  author: string
  cover_url?: string
  description?: string
  amazon_rating?: number
  self_rating?: number
  recommended_by?: string
  genre?: string
}

export interface DbUserBook {
  id?: string
  user_id: string
  book_id: string
  status: string
  rating?: number
  notes?: string
  start_date?: string
  finish_date?: string
  current_page?: number
  total_pages?: number
  created_at?: string
  updated_at?: string
}

// Application types (what we use in our components)
export interface Book {
  id: string
  title: string
  author: string
  cover?: string
  status: BookStatus
  description?: string
  genre?: string
  amazonRating?: number
  selfRating?: number
  recommendedBy?: string
  rating?: number
  notes?: string
  startDate?: string
  finishDate?: string
  currentPage?: number
  totalPages?: number
}

export type BookStatus = "reading" | "queued" | "completed" | "recommended" | "onHold"

export interface Profile {
  id: string
  userId: string
  name: string
  email: string
  avatarUrl?: string
}
