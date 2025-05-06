"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUserFirstName } from "@/lib/user-utils"

export default function SettingsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Get the user's first name
  const firstName = getUserFirstName(user)

  // Get the user's email or use a placeholder
  const email = user?.email || "user@example.com"

  return (
    <div className="container mx-auto py-10">
      <Link href="/books" className="flex items-center text-primary mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Books
      </Link>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Account Settings</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-medium">{firstName}</p>
              <p className="text-gray-600">{email}</p>
            </div>
          </div>

          <p className="text-gray-500 italic">Settings page functionality will be implemented in a future update.</p>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
