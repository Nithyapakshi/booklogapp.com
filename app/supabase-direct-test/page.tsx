"use client"

import { useState } from "react"
import Link from "next/link"

export default function SupabaseDirectTestPage() {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const testDirectFetch = async () => {
    setStatus("Testing direct fetch to Supabase...")
    setError(null)
    setResult(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        setError("Missing Supabase environment variables")
        return
      }

      // Test a direct fetch to the Supabase REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      })

      const data = await response.json()

      setResult({
        status: response.status,
        statusText: response.statusText,
        data,
      })

      setStatus("Direct fetch completed")
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const checkCors = async () => {
    setStatus("Checking CORS configuration...")
    setError(null)
    setResult(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

      if (!supabaseUrl) {
        setError("Missing Supabase URL")
        return
      }

      // Send an OPTIONS request to check CORS
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "OPTIONS",
      })

      const corsHeaders = {
        "access-control-allow-origin": response.headers.get("access-control-allow-origin"),
        "access-control-allow-methods": response.headers.get("access-control-allow-methods"),
        "access-control-allow-headers": response.headers.get("access-control-allow-headers"),
      }

      setResult({
        status: response.status,
        statusText: response.statusText,
        corsHeaders,
      })

      setStatus("CORS check completed")
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Supabase Direct Test</h1>

      <div className="space-y-4 mb-6">
        <button onClick={testDirectFetch} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Test Direct Fetch to Supabase
        </button>

        <button onClick={checkCors} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Check CORS Configuration
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

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
        <h2 className="font-bold mb-2">CORS Troubleshooting:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Go to your Supabase project dashboard</li>
          <li>Navigate to Project Settings > API</li>
          <li>Under "API Settings", find the "CORS" section</li>
          <li>
            Add your application's domain to the allowed origins (e.g., <code>https://your-app.vercel.app</code>)
          </li>
          <li>
            For local development, add <code>http://localhost:3000</code>
          </li>
          <li>Click "Save" and wait a few minutes for changes to propagate</li>
        </ol>
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
