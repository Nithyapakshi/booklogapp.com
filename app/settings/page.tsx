"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export default function SettingsPage() {
  const { user } = useAuth()
  const [profileName, setProfileName] = useState<string>("")
  const email = user?.email || ""

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase
        .from("profiles")
        .select("name, username")
        .eq("user_id", user.id)
        .single()
      console.log("Profile fetch:", data, error)
      if (data?.name) setProfileName(data.name)
      else if (data?.username) setProfileName(data.username)
    }
    fetchProfile()
  }, [user])

  const displayName = profileName || email.split("@")[0]
  const initial = displayName.charAt(0).toUpperCase()

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
            <div className="h-16 w-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
              {initial}
            </div>
            <div>
              <p className="text-lg font-medium">{displayName}</p>
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
