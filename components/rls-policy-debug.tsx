"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export function RLSPolicyDebug() {
  const [policyInfo, setPolicyInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkPolicies = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClientSupabaseClient()

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw new Error(`Auth error: ${userError.message}`)
      }

      // Try to get policies (this might fail due to permissions)
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

      // Test insert permission
      const testBook = {
        id: crypto.randomUUID(),
        title: "Test Book for RLS",
        author: "RLS Tester",
        status: "reading",
        user_id: userData.user?.id,
        created_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase.from("books").insert(testBook).select()

      if (insertError) {
        setPolicyInfo((prev) => ({
          ...prev,
          insertTest: {
            success: false,
            error: insertError.message,
            userId: userData.user?.id,
          },
        }))
      } else {
        // Delete the test book
        await supabase.from("books").delete().eq("id", testBook.id)

        setPolicyInfo((prev) => ({
          ...prev,
          insertTest: {
            success: true,
            userId: userData.user?.id,
          },
        }))
      }
    } catch (err) {
      console.error("Policy check error:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-md bg-gray-50 mt-4">
      <h2 className="text-lg font-semibold mb-2">RLS Policy Debug</h2>

      <Button onClick={checkPolicies} disabled={isLoading} size="sm" className="mb-4">
        {isLoading ? "Checking Policies..." : "Check RLS Policies"}
      </Button>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded mb-4">{error}</div>}

      {policyInfo && (
        <div>
          <h3 className="font-medium mb-2">Policy Information:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-60 mb-4 whitespace-pre-wrap">
            {JSON.stringify(policyInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
