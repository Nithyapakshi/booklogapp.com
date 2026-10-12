import type { BookSearchResult } from "@/lib/google-books-api"

export function validBookISBN(input: string): string | null {
  const value = input.trim().toUpperCase().replace(/[\s-]/g, "")
  if (/^\d{9}[\dX]$/.test(value)) {
    const sum = [...value].reduce((n, digit, index) => n + (digit === "X" ? 10 : Number(digit)) * (10 - index), 0)
    return sum % 11 === 0 ? value : null
  }
  if (/^97[89]\d{10}$/.test(value)) {
    const sum = [...value].reduce((n, digit, index) => n + Number(digit) * (index % 2 === 0 ? 1 : 3), 0)
    return sum % 10 === 0 ? value : null
  }
  return null
}

export function isbn13(input: string): string | null {
  const value = validBookISBN(input)
  if (!value) return null
  if (value.length === 13) return value
  const prefix = "978" + value.slice(0, 9)
  const sum = [...prefix].reduce((n, digit, index) => n + Number(digit) * (index % 2 === 0 ? 1 : 3), 0)
  return prefix + ((10 - sum % 10) % 10)
}

export function sameISBN(a: string, b: string): boolean {
  const canonical = isbn13(a)
  return canonical !== null && canonical === isbn13(b)
}

const normal = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const title = (s: string) => normal(s.split(":")[0].replace(/\s*\([^)]*(?:edition|anniversary)[^)]*\)\s*/gi, ""))

export function matchingEditions(seed: BookSearchResult, candidates: BookSearchResult[]): BookSearchResult[] {
  if (!seed.title || !seed.author || seed.title === "Unknown Title" || seed.author === "Unknown Author") return []
  return candidates.filter(book => title(book.title) === title(seed.title) && normal(book.author) === normal(seed.author))
}
