"use client"

import { useState } from "react"
import Link from "next/link"

export default function AuthDiagnosticPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [email, setEmail] = useState("test@example.com")
  const [password, setPassword] = useState("password123")

  const testAuth = async () => {
    setStatus("Testing authentication...")
    setError(null)
    setResult(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        setError("Missing Supabase environment variables")
        return
      }

      setStatus("Loading Supabase client...")

      // Import directly to avoid any issues with singleton
      const { createClient } = await import("@supabase/supabase-js")

      setStatus("Creating Supabase client...")

      // Create a new client with minimal options
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      setStatus("Testing signInWithPassword...")

      try {
        // Attempt a sign in but catch the error to analyze it
        await supabase.auth.signInWithPassword({
          email,
          password,
        })
      } catch (authErr) {
        // We expect this to fail with invalid credentials, but we want to see the error type
        setResult({
          authError:
            authErr instanceof Error
              ? {
                  name: authErr.name,
                  message: authErr.message,
                  stack: authErr.stack?.split("\n").slice(0, 3).join("\n"),
                }
              : String(authErr),
        })

        if (
          authErr instanceof Error &&
          (authErr.message.includes("fetch") || authErr.message.includes("network") || authErr.message.includes("CORS"))
        ) {
          setError("Network/CORS error detected. This indicates a CORS configuration issue.")
        } else {
          setStatus("Auth test completed with expected credential error")
        }
        return
      }

      setStatus("Auth test completed")
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Diagnostic Tool</h1>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
        <h2 className="font-bold mb-2">How to Fix Supabase Auth Issues:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            In your Supabase dashboard, go to <strong>Authentication → URL Configuration</strong>
          </li>
          <li>
            Add your site URL to the <strong>Site URL</strong> field (e.g., <code>https://mybooklog.vercel.app</code>)
          </li>
          <li>
            Add your domains to the <strong>Redirect URLs</strong> field:
            <ul className="list-disc pl-5 mt-1">
              <li>
                <code>https://mybooklog.vercel.app/**</code>
              </li>
              <li>
                <code>http://localhost:3000/**</code> (for local development)
              </li>
            </ul>
          </li>
          <li>Save the changes and wait a few minutes for them to take effect</li>
        </ol>
      </div>

      <div className="space-y-4 mb-6">
        <button onClick={testAuth} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Test Authentication
        </button>
      </div>

      {status && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <p className="font-medium">Status: {status}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
          <h2 className="font-bold mb-2">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-white border rounded-lg mb-4">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="flex justify-between">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
