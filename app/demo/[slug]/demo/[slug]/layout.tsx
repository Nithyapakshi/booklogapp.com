import type React from "react"
import type { Metadata } from "next"

// Demo links are shared directly with organisers; keep them out of search results.
export const metadata: Metadata = {
  title: "BookLog demo library",
  robots: { index: false, follow: false },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
