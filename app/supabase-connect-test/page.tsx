"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function SupabaseConnectTestPage() {
  const [status, setStatus] = useState<string>("Initializing...")
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        setStatus("Checking environment variables...")

        // Check if we have the Supabase URL and key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
          setError("Missing Supabase environment variables")
          return
        }

        setStatus("Loading Supabase client...")

        // Import the Supabase client library
        const { createClient } = await import("@supabase/supabase-js")

        setStatus("Creating Supabase client...")

        // Create a new client with minimal options
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        })

        setStatus("Testing connection with health check...")

        // Try a simple health check
        try {
          const { data, error } = await supabase.rpc("get_service_status")

          if (error) {
            // Try a fallback query if RPC fails
            setStatus("RPC failed, trying simple query...")
            const { error: queryError } = await supabase.from("_dummy_query").select("*").limit(1)

            if (queryError) {
              if (queryError.code === "PGRST116") {
                // This is actually a good sign - it means we connected but the table doesn't exist
                setResult({
                  connected: true,
                  message: "Connected to Supabase but table doesn't exist (expected)",
                  error: queryError,
                })
              } else {
                setError(`Query error: ${queryError.message}`)
              }
            } else {
              setResult({
                connected: true,
                message: "Connected to Supabase successfully",
              })
            }
          } else {
            setResult({
              connected: true,
              message: "Connected to Supabase successfully",
              serviceStatus: data,
            })
          }
        } catch (queryErr) {
          setError(`Connection test error: ${queryErr instanceof Error ? queryErr.message : String(queryErr)}`)
        }
      } catch (err) {
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Connection Test</h1>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
        <p className="font-medium">Status: {status}</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-6">
          <h2 className="font-bold mb-2">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg mb-6">
          <h2 className="font-bold mb-2">Connection Result:</h2>
          <p>{result.message}</p>
          {result.serviceStatus && (
            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
              {JSON.stringify(result.serviceStatus, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
        <h2 className="font-bold mb-2">Troubleshooting Tips:</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Make sure your Supabase project is active</li>
          <li>Check that your API keys are correct</li>
          <li>Verify that your project allows requests from your domain (CORS settings)</li>
          <li>Try using the Supabase dashboard to check your project status</li>
        </ul>
      </div>

      <div className="flex justify-between">
        <Link href="/home-debug" className="text-blue-600 hover:underline">
          Back to Debug Home
        </Link>
        <Link href="/env-debug" className="text-blue-600 hover:underline">
          Check Environment Variables
        </Link>
      </div>
    </div>
  )
}
