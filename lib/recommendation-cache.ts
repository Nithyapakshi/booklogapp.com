import type { BookSearchResult } from "@/types"

// Define the cache structure
interface RecommendationCache {
  query: string
  results: BookSearchResult[]
  timestamp: number
}

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000

// Cache key in localStorage
const CACHE_KEY = "booklog-ai-recommendations"

/**
 * Get cached recommendations for a query
 */
export function getCachedRecommendations(query: string): BookSearchResult[] | null {
  try {
    // Check if localStorage is available (for SSR compatibility)
    if (typeof window === "undefined") return null

    console.log("Checking cache for query:", query)

    // Normalize the query by trimming and converting to lowercase
    const normalizedQuery = query.trim().toLowerCase()

    const cachedData = localStorage.getItem(CACHE_KEY)
    if (!cachedData) {
      console.log("No cache data found")
      return null
    }

    const cacheEntries: RecommendationCache[] = JSON.parse(cachedData)

    // Find the cache entry for this query (case insensitive)
    const cacheEntry = cacheEntries.find((entry) => entry.query.trim().toLowerCase() === normalizedQuery)

    // If no entry or expired, return null
    if (!cacheEntry) {
      console.log("No cache entry found for query:", query)
      return null
    }

    const now = Date.now()
    if (now - cacheEntry.timestamp > CACHE_EXPIRATION) {
      // Cache expired
      console.log("Cache entry expired for query:", query)
      return null
    }

    console.log("Cache hit for query:", query)
    return cacheEntry.results
  } catch (error) {
    console.error("Error reading recommendation cache:", error)
    return null
  }
}

/**
 * Save recommendations to cache
 */
export function cacheRecommendations(query: string, results: BookSearchResult[]): void {
  try {
    // Check if localStorage is available (for SSR compatibility)
    if (typeof window === "undefined") return

    console.log("Saving recommendations to cache for query:", query)

    // Normalize the query
    const normalizedQuery = query.trim()

    const now = Date.now()
    const newEntry: RecommendationCache = {
      query: normalizedQuery,
      results,
      timestamp: now,
    }

    // Get existing cache or initialize empty array
    const cachedData = localStorage.getItem(CACHE_KEY)
    let cacheEntries: RecommendationCache[] = cachedData ? JSON.parse(cachedData) : []

    // Remove any existing entry for this query (case insensitive)
    cacheEntries = cacheEntries.filter((entry) => entry.query.trim().toLowerCase() !== normalizedQuery.toLowerCase())

    // Add the new entry
    cacheEntries.push(newEntry)

    // Limit cache size to 10 entries to prevent localStorage from getting too large
    if (cacheEntries.length > 10) {
      // Remove oldest entries
      cacheEntries.sort((a, b) => b.timestamp - a.timestamp)
      cacheEntries = cacheEntries.slice(0, 10)
    }

    // Save back to localStorage
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntries))
    console.log("Successfully saved to cache")
  } catch (error) {
    console.error("Error saving recommendation cache:", error)
  }
}
