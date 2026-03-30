"use client"

import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserFirstName } from "@/lib/user-utils"

export function BooksHeader() {
  const { user } = useAuth()

  // Get the user's first name
  const firstName = getUserFirstName(user)

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">My Books</h1>

      <div className="flex items-center gap-3">
        <span className="text-lg font-medium">{firstName}</span>
        <Link href="/settings">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-blue-600 text-white h-10 w-10 hover:bg-blue-700"
          >
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
