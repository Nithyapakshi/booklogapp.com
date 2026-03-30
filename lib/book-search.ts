// This service mocks a book search API
// In a real app, you would replace this with actual API calls

interface BookSearchResult {
  id: string
  title: string
  author: string
  cover: string
  description?: string
  publishedYear?: number
}

// Sample book database for mock searches
const bookDatabase: BookSearchResult[] = [
  {
    id: "1",
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    cover: "https://m.media-amazon.com/images/I/71FxgtFKcQL._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1960,
    description:
      "The story of young Scout Finch, her brother Jem, and their father Atticus, a lawyer defending a Black man accused of raping a white woman in the racially charged 1930s Alabama.",
  },
  {
    id: "2",
    title: "1984",
    author: "George Orwell",
    cover: "https://m.media-amazon.com/images/I/71kxa1-0mfL._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1949,
    description:
      "A dystopian novel set in a totalitarian society ruled by the Party, which has total control over every aspect of people's lives, including their thoughts.",
  },
  {
    id: "3",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    cover: "https://m.media-amazon.com/images/I/71FTb9X6wsL._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1925,
    description:
      "Set in the Jazz Age, it tells the story of eccentric millionaire Jay Gatsby and his obsession with the beautiful Daisy Buchanan.",
  },
  {
    id: "4",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    cover: "https://m.media-amazon.com/images/I/71Q1tPupKjL._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1813,
    description:
      "The story follows Elizabeth Bennet, who learns about the repercussions of hasty judgments and comes to appreciate the difference between superficial goodness and actual goodness.",
  },
  {
    id: "5",
    title: "The Hobbit",
    author: "J.R.R. Tolkien",
    cover: "https://m.media-amazon.com/images/I/710+HcoP38L._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1937,
    description:
      "The story of Bilbo Baggins, a hobbit who is swept into an epic quest to reclaim the Lonely Mountain from the dragon Smaug.",
  },
  {
    id: "6",
    title: "Harry Potter and the Sorcerer's Stone",
    author: "J.K. Rowling",
    cover: "https://m.media-amazon.com/images/I/81iqZ2HHD-L._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1997,
    description:
      "The first novel in the Harry Potter series, it follows Harry Potter, a young wizard who discovers his magical heritage on his eleventh birthday.",
  },
  {
    id: "7",
    title: "The Lord of the Rings",
    author: "J.R.R. Tolkien",
    cover: "https://m.media-amazon.com/images/I/71jLBXtWJWL._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1954,
    description:
      "An epic high-fantasy novel that follows the quest to destroy the One Ring, which was created by the Dark Lord Sauron.",
  },
  {
    id: "8",
    title: "The Catcher in the Rye",
    author: "J.D. Salinger",
    cover: "https://m.media-amazon.com/images/I/61-1ths3SzL._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1951,
    description:
      "The story of Holden Caulfield, a teenage boy who has been expelled from prep school and is wandering around New York City.",
  },
  {
    id: "9",
    title: "The Alchemist",
    author: "Paulo Coelho",
    cover: "https://m.media-amazon.com/images/I/71VF8XBO43L._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1988,
    description:
      "The story follows Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure. His quest leads him to riches far different—and far more satisfying—than he ever imagined.",
  },
  {
    id: "10",
    title: "Brave New World",
    author: "Aldous Huxley",
    cover: "https://m.media-amazon.com/images/I/71eLMJ3nnnL._AC_UF1000,1000_QL80_.jpg",
    publishedYear: 1932,
    description:
      "Set in a futuristic World State, inhabited by genetically modified citizens and an intelligence-based social hierarchy, the novel anticipates developments in reproductive technology and sleep-learning that combine to change society.",
  },
]

// Track API calls for demonstration purposes
let apiCallCount = 0
const MAX_CALLS_PER_MINUTE = 100
let lastResetTime = Date.now()

class BookSearchService {
  async search(query: string): Promise<BookSearchResult[]> {
    // Simulate API rate limiting
    const now = Date.now()
    if (now - lastResetTime > 60000) {
      apiCallCount = 0
      lastResetTime = now
    }

    apiCallCount++

    // Simulate network delay (150-250ms to simulate real API)
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100 + 150))

    // Simulate rate limiting
    if (apiCallCount > MAX_CALLS_PER_MINUTE) {
      console.warn("API rate limit exceeded! In a real app, this would block further requests.")
      // In a real app, we might throw an error here
    }

    // Simple search implementation
    const lowercaseQuery = query.toLowerCase()
    return bookDatabase.filter(
      (book) => book.title.toLowerCase().includes(lowercaseQuery) || book.author.toLowerCase().includes(lowercaseQuery),
    )
  }

  async getBookDetails(id: string): Promise<BookSearchResult | undefined> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200))

    return bookDatabase.find((book) => book.id === id)
  }
}

export const bookSearchService = new BookSearchService()
