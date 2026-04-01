"use client"

import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { useState, useEffect } from "react"

export function BooksHeader() {
  const { user } = useAuth()
  const [firstName, setFirstName] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return
      const supabase = createClientSupabaseClient()
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .single()
      if (data?.name) setFirstName(data.name)
    }
    fetchProfile()
  }, [user])

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-3xl font-bold">My Books</h1>
      <div className="flex items-center gap-3">
        {firstName && <span className="text-lg font-medium">{firstName}</span>}
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
