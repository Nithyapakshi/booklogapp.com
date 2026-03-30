"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"

export default function TestPage() {
  const [status, setStatus] = useState("Checking authentication...")
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClientSupabaseClient()
        const { data, error } = await supabase.auth.getUser()

        if (error) {
          setStatus(`Error: ${error.message}`)
        } else if (data.user) {
          setStatus("Authenticated")
          setUser(data.user)
        } else {
          setStatus("Not authenticated")
        }
      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    checkAuth()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      <p className="mb-4">Status: {status}</p>

      {user && (
        <div className="p-4 bg-green-100 rounded">
          <p className="font-bold">Logged in as: {user.email}</p>
          <pre className="mt-4 bg-gray-100 p-2 rounded text-xs overflow-auto">{JSON.stringify(user, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
