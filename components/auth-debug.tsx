"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export function AuthDebug() {
  const [sessionInfo, setSessionInfo] = useState<string>("Checking session...")
  const [isLoading, setIsLoading] = useState(false)
  const [localStorageInfo, setLocalStorageInfo] = useState<string>("")
  const [rlsTestResult, setRlsTestResult] = useState<string>("")

  useEffect(() => {
    // Check session on mount
    checkSession()

    // Check localStorage
    checkLocalStorage()
  }, [])

  const checkLocalStorage = () => {
    try {
      const storedUser = localStorage.getItem("booklog-user")
      const supabaseAuthData = localStorage.getItem("booklog-auth")

      setLocalStorageInfo(`
LocalStorage Data:
- booklog-user: ${storedUser ? "Present" : "Not found"}
- booklog-auth: ${supabaseAuthData ? "Present" : "Not found"}
${
  storedUser
    ? `
Stored User: ${JSON.stringify(JSON.parse(storedUser), null, 2)}`
    : ""
}
      `)
    } catch (error) {
      setLocalStorageInfo(`Error reading localStorage: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const checkSession = async () => {
    setIsLoading(true)
    try {
      // Create a fresh Supabase client for this check
      const supabase = createClientSupabaseClient()

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        setSessionInfo(`Error: ${error.message}`)
        return
      }

      if (!session) {
        setSessionInfo("No active session found. You need to sign in.")
        return
      }

      setSessionInfo(`Active session found:
User ID: ${session.user.id}
Email: ${session.user.email}
Expires at: ${new Date(session.expires_at! * 1000).toLocaleString()}
      `)
    } catch (error) {
      setSessionInfo(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testRlsPolicy = async () => {
    setIsLoading(true)
    try {
      const supabase = createClientSupabaseClient()

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        setRlsTestResult(`Auth error: ${userError.message}`)
        return
      }

      if (!userData.user) {
        setRlsTestResult("No authenticated user found")
        return
      }

      // Try to insert a test book
      const testBook = {
        id: crypto.randomUUID(),
        title: "RLS Test Book",
        author: "Test Author",
        status: "reading",
        user_id: userData.user.id,
        created_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase.from("books").insert(testBook)

      if (insertError) {
        setRlsTestResult(`RLS test failed: ${insertError.message}`)
        return
      }

      // Delete the test book
      await supabase.from("books").delete().eq("id", testBook.id)

      setRlsTestResult("RLS test passed! You can insert books with your user ID.")
    } catch (error) {
      setRlsTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshSession = async () => {
    setIsLoading(true)
    try {
      // Create a fresh Supabase client for this refresh
      const supabase = createClientSupabaseClient()

      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        setSessionInfo(`Refresh error: ${error.message}`)
        return
      }

      if (!data.session) {
        setSessionInfo("Failed to refresh session")
        return
      }

      setSessionInfo(`Session refreshed:
User ID: ${data.session.user.id}
Email: ${data.session.user.email}
Expires at: ${new Date(data.session.expires_at! * 1000).toLocaleString()}
      `)
    } catch (error) {
      setSessionInfo(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h2 className="text-lg font-semibold mb-2">Authentication Debug</h2>
      <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-40 mb-4 whitespace-pre-wrap">
        {sessionInfo}
      </pre>

      <div className="mb-4">
        <h3 className="font-medium mb-2">Local Storage Data</h3>
        <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-40 whitespace-pre-wrap">
          {localStorageInfo}
        </pre>
      </div>

      {rlsTestResult && (
        <div className="mb-4">
          <h3 className="font-medium mb-2">RLS Test Result</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-40 whitespace-pre-wrap">
            {rlsTestResult}
          </pre>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={checkSession} disabled={isLoading} size="sm">
          Check Session
        </Button>
        <Button onClick={refreshSession} disabled={isLoading} variant="outline" size="sm">
          Refresh Session
        </Button>
        <Button onClick={testRlsPolicy} disabled={isLoading} variant="outline" size="sm">
          Test RLS Policy
        </Button>
        <Button
          onClick={recreateSessionFromUser}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="bg-green-100"
        >
          Recreate Session
        </Button>
      </div>
    </div>
  )

  // Function to recreate a session from the stored user data
  async function recreateSessionFromUser() {
    setIsLoading(true)
    try {
      // Get the stored user from localStorage
      const storedUserJson = localStorage.getItem("booklog-user")
      if (!storedUserJson) {
        setSessionInfo("No stored user found in localStorage")
        return
      }

      const storedUser = JSON.parse(storedUserJson)
      if (!storedUser || !storedUser.id) {
        setSessionInfo("Invalid user data in localStorage")
        return
      }

      // Create a fresh Supabase client
      const supabase = createClientSupabaseClient()

      // Try to create a new session using the stored user's email
      // This is a workaround to fix the missing session
      if (storedUser.email) {
        setSessionInfo(`Attempting to recreate session for ${storedUser.email}...`)

        // Clear any existing auth data to avoid conflicts
        localStorage.removeItem("booklog-auth")

        // Use the stored user ID to create a custom session
        // Note: This is a simplified approach - in a real app, you'd use a more secure method
        const { data, error } = await supabase.auth.signInWithPassword({
          email: prompt("Please enter your email to recreate the session") || "",
          password: prompt("Please enter your password") || "",
        })

        if (error) {
          setSessionInfo(`Failed to recreate session: ${error.message}`)
        } else if (data.session) {
          setSessionInfo(`Session successfully recreated!
User ID: ${data.session.user.id}
Email: ${data.session.user.email}
Expires at: ${new Date(data.session.expires_at! * 1000).toLocaleString()}
          `)

          // Refresh the page to apply the new session
          setTimeout(() => window.location.reload(), 2000)
        }
      } else {
        setSessionInfo("Cannot recreate session: No email found in stored user data")
      }
    } catch (error) {
      setSessionInfo(`Error recreating session: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }
}
