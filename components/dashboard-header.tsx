"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { getUserFirstName } from "@/lib/user-utils"

export default function DashboardHeader() {
  const { user, signOut } = useAuth()

  // Get the user's first name
  const firstName = getUserFirstName(user)
  // Get initials from the first name
  const initials = firstName.charAt(0).toUpperCase() || "U"

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold">My Books</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" id="debug-button">
          Show Debug
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 mr-1"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 21h5v-5" />
          </svg>
          Reload Books
        </Button>
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 mr-1"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </Button>
        <Link href="/profile" className="flex items-center gap-2">
          <span className="text-sm font-medium">{firstName}</span>
          <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
            {initials}
          </div>
        </Link>
      </div>
    </div>
  )
}
