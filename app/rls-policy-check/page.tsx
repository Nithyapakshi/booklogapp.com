"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function RLSPolicyCheckPage() {
  const [policyInfo, setPolicyInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<any[]>([])

  const checkPolicies = async () => {
    setIsLoading(true)
    setError(null)
    setTestResults([])

    try {
      const supabase = createClientSupabaseClient()

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw new Error(`Auth error: ${userError.message}`)
      }

      if (!userData.user) {
        throw new Error("No authenticated user found")
      }

      // Test RLS policies with different operations
      const testResults = []

      // Test 1: SELECT - Can user read their own books?
      try {
        const { data: books, error: selectError } = await supabase.from("books").select("id, title").limit(1)

        testResults.push({
          operation: "SELECT",
          success: !selectError,
          error: selectError?.message,
          data: books?.length > 0 ? "Found books" : "No books found",
        })
      } catch (err) {
        testResults.push({
          operation: "SELECT",
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }

      // Test 2: INSERT - Can user insert a book?
      try {
        const testBook = {
          id: crypto.randomUUID(),
          title: "RLS Test Book",
          author: "Test Author",
          status: "reading",
          user_id: userData.user?.id,
          created_at: new Date().toISOString(),
        }

        const { error: insertError } = await supabase.from("books").insert(testBook)

        if (!insertError) {
          // Delete the test book if insert was successful
          await supabase.from("books").delete().eq("id", testBook.id)
        }

        testResults.push({
          operation: "INSERT",
          success: !insertError,
          error: insertError?.message,
        })
      } catch (err) {
        testResults.push({
          operation: "INSERT",
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }

      // Test 3: UPDATE - Can user update their own book?
      try {
        // First create a test book
        const testBook = {
          id: crypto.randomUUID(),
          title: "RLS Update Test Book",
          author: "Test Author",
          status: "reading",
          user_id: userData.user?.id,
          created_at: new Date().toISOString(),
        }

        await supabase.from("books").insert(testBook)

        // Try to update it
        const { error: updateError } = await supabase
          .from("books")
          .update({ title: "Updated Title" })
          .eq("id", testBook.id)

        // Delete the test book
        await supabase.from("books").delete().eq("id", testBook.id)

        testResults.push({
          operation: "UPDATE",
          success: !updateError,
          error: updateError?.message,
        })
      } catch (err) {
        testResults.push({
          operation: "UPDATE",
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }

      // Test 4: DELETE - Can user delete their own book?
      try {
        // First create a test book
        const testBook = {
          id: crypto.randomUUID(),
          title: "RLS Delete Test Book",
          author: "Test Author",
          status: "reading",
          user_id: userData.user?.id,
          created_at: new Date().toISOString(),
        }

        await supabase.from("books").insert(testBook)

        // Try to delete it
        const { error: deleteError } = await supabase.from("books").delete().eq("id", testBook.id)

        testResults.push({
          operation: "DELETE",
          success: !deleteError,
          error: deleteError?.message,
        })
      } catch (err) {
        testResults.push({
          operation: "DELETE",
          success: false,
          error: err instanceof Error ? err.message : String(err),
        })
      }

      setTestResults(testResults)

      // Try to get policies (this might fail due to permissions, which is expected)
      try {
        const { data: policies, error: policiesError } = await supabase
          .from("pg_policies")
          .select("*")
          .eq("tablename", "books")

        if (policiesError) {
          setPolicyInfo({
            message: "Could not directly query policies (expected)",
            error: policiesError.message,
            note: "This is normal - most users don't have permission to query pg_policies",
          })
        } else {
          setPolicyInfo({
            policies,
          })
        }
      } catch (err) {
        console.log("Policy query failed (expected):", err)
      }
    } catch (err) {
      console.error("Policy check error:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/books" className="flex items-center text-primary mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Books
      </Link>

      <h1 className="text-2xl font-bold mb-6">RLS Policy Check</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="mb-4">
          This page tests the Row Level Security (RLS) policies for your Supabase database. It will perform various
          operations (SELECT, INSERT, UPDATE, DELETE) to verify that the policies are working correctly.
        </p>

        <Button onClick={checkPolicies} disabled={isLoading} className="mb-4">
          {isLoading ? "Checking Policies..." : "Check RLS Policies"}
        </Button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-4">
            <h2 className="font-bold mb-2">Error:</h2>
            <p>{error}</p>
          </div>
        )}

        {testResults.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Test Results:</h2>
            <div className="grid gap-4">
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-md ${
                    test.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{test.operation} Operation</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        test.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {test.success ? "Success" : "Failed"}
                    </span>
                  </div>
                  {test.error && <p className="text-sm mt-2 text-red-600">Error: {test.error}</p>}
                  {test.data && <p className="text-sm mt-2">{test.data}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {policyInfo && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Policy Information:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-60 mb-4 whitespace-pre-wrap">
              {JSON.stringify(policyInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Link href="/books" className="text-blue-600 hover:underline">
          Back to Books
        </Link>
        <Link href="/schema-check" className="text-blue-600 hover:underline">
          Check Schema
        </Link>
      </div>
    </div>
  )
}
