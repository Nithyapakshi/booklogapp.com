"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function EnvCheckPage() {
  const [envVars, setEnvVars] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    setEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : null,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })

    setLoading(false)
  }, [])

  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Environment Variables Check</h1>

      {loading ? (
        <p>Loading environment variables...</p>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="font-bold mb-2">Environment Variables:</h2>
            <pre className="p-4 bg-gray-100 rounded overflow-auto text-xs">{JSON.stringify(envVars, null, 2)}</pre>
          </div>

          <div className="mb-4">
            <h2 className="font-bold mb-2">Status:</h2>
            {envVars.hasSupabaseUrl && envVars.hasSupabaseKey ? (
              <p className="text-green-600">✅ All required environment variables are present</p>
            ) : (
              <p className="text-red-600">❌ Missing required environment variables</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
