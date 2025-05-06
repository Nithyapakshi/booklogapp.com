"use client"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function DebugButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkAuth = async () => {
    setIsLoading(true)
    try {
      const supabase = createClientSupabaseClient()
      const { data: authData } = await supabase.auth.getUser()

      if (authData.user) {
        // If user is authenticated, fetch their books
        const { data: books, error } = await supabase.from("books").select("*").eq("user_id", authData.user.id)

        setDebugInfo({
          auth: {
            isAuthenticated: true,
            userId: authData.user.id,
            email: authData.user.email,
          },
          books: {
            count: books?.length || 0,
            error: error?.message,
            data: books,
          },
        })
      } else {
        setDebugInfo({
          auth: {
            isAuthenticated: false,
          },
        })
      }
    } catch (error) {
      setDebugInfo({
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className="bg-white shadow-md">
          Debug
        </Button>
      ) : (
        <div className="bg-white p-4 rounded-lg shadow-lg max-w-md max-h-[80vh] overflow-auto">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold">Debug Info</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={checkAuth} disabled={isLoading} className="mb-4">
            {isLoading ? "Checking..." : "Check Auth & Books"}
          </Button>

          {debugInfo && (
            <pre className="text-xs whitespace-pre-wrap bg-gray-100 p-2 rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
