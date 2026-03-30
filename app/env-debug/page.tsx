"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function EnvDebugPage() {
  const [envVars, setEnvVars] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Collect all available environment variables
    const envData = {
      // Check all possible Supabase environment variables
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "exists (masked)" : null,

      // Check if we're in development or production
      NODE_ENV: process.env.NODE_ENV,

      // Check browser information
      userAgent: window.navigator.userAgent,

      // Check timestamp
      timestamp: new Date().toISOString(),
    }

    setEnvVars(envData)
    setLoading(false)
  }, [])

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Environment Variables Debug</h1>

      {loading ? (
        <p>Loading environment data...</p>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Supabase Environment Variables</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="font-medium w-64">NEXT_PUBLIC_SUPABASE_URL:</span>
                <span className={envVars.NEXT_PUBLIC_SUPABASE_URL ? "text-green-600" : "text-red-600"}>
                  {envVars.NEXT_PUBLIC_SUPABASE_URL
                    ? `${envVars.NEXT_PUBLIC_SUPABASE_URL.substring(0, 15)}...`
                    : "Missing ❌"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-64">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
                <span className={envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "text-green-600" : "text-red-600"}>
                  {envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || "Missing ❌"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Environment Information</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="font-medium w-64">NODE_ENV:</span>
                <span>{envVars.NODE_ENV}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-64">User Agent:</span>
                <span className="text-sm">{envVars.userAgent}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium w-64">Timestamp:</span>
                <span>{envVars.timestamp}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Troubleshooting Steps</h2>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Make sure your Supabase environment variables are correctly set in your Vercel project settings.</li>
              <li>Check that your Supabase project is active and accessible.</li>
              <li>Verify that your Supabase project allows requests from your domain (CORS settings).</li>
              <li>Try creating a new Supabase project and updating the environment variables.</li>
            </ol>
          </div>

          <div className="flex justify-between">
            <Link href="/home-debug" className="text-blue-600 hover:underline">
              Back to Debug Home
            </Link>
            <Link href="/api/env-check" className="text-blue-600 hover:underline">
              Check Server-Side Environment Variables
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
