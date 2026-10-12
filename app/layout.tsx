import "./globals.css"
import type React from "react"
import type { Metadata } from "next"
import { AuthProvider } from "@/components/auth/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { BookProvider } from "@/lib/book-context"

export const metadata: Metadata = {
  title: "BookLog - Track Your Reading Journey",
  description: "Keep track of your books, organize your collection, and share recommendations with friends.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="booklog-theme" disableTransitionOnChange>
        <AuthProvider>
          <BookProvider>{children}</BookProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'
