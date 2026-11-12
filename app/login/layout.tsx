import type { Metadata } from "next"

// /login is crawlable but excluded from the index (Search Console:
// "Indexed, though blocked by robots.txt" fix - crawl allowed, noindex served).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
