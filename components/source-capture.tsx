"use client"

import { useEffect } from "react"
import { captureSource } from "@/lib/signup-source"

// Remembers which link or site brought this visit (see lib/signup-source.ts). Renders nothing.
export function SourceCapture() {
  useEffect(() => {
    captureSource()
  }, [])
  return null
}
