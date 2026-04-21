export interface Book {
  id: string
  title: string
  author: string
  cover?: string
  status: string
  description?: string
  publishedYear?: number
  rowId?: string
  selfRating?: number
  notes?: string
}

export interface BookSearchResult {
  id: string
  title: string
  author: string
  cover: string
  description?: string
  publishedYear?: number
}
