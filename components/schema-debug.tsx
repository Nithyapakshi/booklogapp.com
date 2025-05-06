"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@supabase/supabase-js"

export function SchemaDebug() {
  const [schemaInfo, setSchemaInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkSchema = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase environment variables")
      }

      const supabase = createClient(supabaseUrl, supabaseKey)

      // Try to insert a test book to see what columns are required
      const testBook = {
        id: "test-" + Date.now(),
        title: "Test Book",
        author: "Test Author",
        cover_url: "https://example.com/test.jpg",
        status: "reading",
        user_id: "test-user",
        created_at: new Date().toISOString(),
      }

      // First try with minimal fields
      try {
        const { error: insertError } = await supabase.from("books").insert(testBook).select()

        if (insertError) {
          setSchemaInfo({
            message: "Insert test failed with minimal fields",
            error: insertError.message,
            testedFields: Object.keys(testBook),
          })
        } else {
          // Delete the test book
          await supabase.from("books").delete().eq("id", testBook.id)

          setSchemaInfo({
            message: "Insert test succeeded with minimal fields",
            testedFields: Object.keys(testBook),
            note: "These are the required fields for the books table",
          })
        }
      } catch (err) {
        setSchemaInfo({
          message: "Error testing schema",
          error: err instanceof Error ? err.message : String(err),
        })
      }

      // Try to get table information directly
      try {
        const { data: tableInfo, error: tableError } = await supabase
          .from("information_schema.columns")
          .select("column_name, data_type, is_nullable")
          .eq("table_name", "books")
          .eq("table_schema", "public")

        if (tableError) {
          setSchemaInfo((prev) => ({
            ...prev,
            tableInfoError: tableError.message,
          }))
        } else {
          setSchemaInfo((prev) => ({
            ...prev,
            tableInfo,
          }))
        }
      } catch (err) {
        setSchemaInfo((prev) => ({
          ...prev,
          tableInfoError: err instanceof Error ? err.message : String(err),
        }))
      }
    } catch (err) {
      console.error("Schema check error:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-md bg-gray-50 mt-4">
      <h2 className="text-lg font-semibold mb-2">Database Schema Debug</h2>

      <Button onClick={checkSchema} disabled={isLoading} size="sm" className="mb-4">
        {isLoading ? "Checking Schema..." : "Check Database Schema"}
      </Button>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-4">{error}</div>}

      {schemaInfo && (
        <div>
          <h3 className="font-medium mb-2">Schema Information:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-60 mb-4 whitespace-pre-wrap">
            {JSON.stringify(schemaInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
