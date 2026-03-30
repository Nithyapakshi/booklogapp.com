import type React from "react"
import { Toast } from "@/components/toast"

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
