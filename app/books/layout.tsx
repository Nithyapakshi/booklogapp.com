import type React from "react"
import { Toast } from "@/components/toast"

// Server actions (Ask AI) run inside this route, so the 10s default would cut them off.
export const maxDuration = 60

export default function BooksLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Main Content */}
      {children}

      {/* Toast Notifications */}
      <Toast />
    </>
  )
}
