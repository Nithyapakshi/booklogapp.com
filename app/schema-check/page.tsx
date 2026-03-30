"use client"

import { createClient } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

export default function SchemaCheckPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tables, setTables] = useState<any[] | null>(null)
  const [envVars, setEnvVars] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function checkSchema() {
      try {
        // Check environment variables
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        setEnvVars({
          NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: !!supabaseKey,
        })

        if (!supabaseUrl || !supabaseKey) {
          setError("Missing Supabase environment variables")
          setLoading(false)
          return
        }

        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Test connection
        const { data: authData, error: authError } = await supabase.auth.getSession()

        if (authError) {
          setError(`Auth error: ${authError.message}`)
          setLoading(false)
          return
        }

        // Try to get a list of tables using RPC
        const { data, error } = await supabase.rpc("get_tables")

        if (error) {
          setError(`Failed to get tables: ${error.message}`)

          // Try an alternative approach - get a known table
          const { data: userData, error: userError } = await supabase.from("users").select("*").limit(1)

          if (userError) {
            setError(`${error.message}. Also failed to query users table: ${userError.message}`)
          } else {
            setError(`${error.message}. But successfully connected to users table.`)
          }
        } else {
          setTables(data)
        }
      } catch (err) {
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    checkSchema()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Schema Check</h1>

      {loading ? (
        <p>Loading schema information...</p>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-2">Tables Found:</h2>
          {tables && tables.length > 0 ? (
            <ul className="list-disc pl-5">
              {tables.map((table, i) => (
                <li key={i}>{JSON.stringify(table)}</li>
              ))}
            </ul>
          ) : (
            <p>No tables found or unable to retrieve table list.</p>
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Environment Variables:</h2>
        <ul className="list-disc pl-5">
          {Object.entries(envVars).map(([key, value]) => (
            <li key={key}>
              {key}: {value ? "✅ Present" : "❌ Missing"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
