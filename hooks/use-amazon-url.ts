"use client"

import { useState, useEffect } from "react"
import { prefetchAmazonDomain, getAmazonSearchUrl } from "@/lib/amazon-link"

export function useAmazonUrl(title: string, author: string): string {
  const [url, setUrl] = useState<string>(() => getAmazonSearchUrl(title, author))

  useEffect(() => {
    prefetchAmazonDomain()
    // Give the prefetch a moment to resolve, then update the URL
    const timer = setTimeout(() => {
      setUrl(getAmazonSearchUrl(title, author))
    }, 500)
    return () => clearTimeout(timer)
  }, [title, author])

  return url
}
