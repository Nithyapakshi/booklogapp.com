"use client"

import { useState } from "react"
import { migrateBooks } from "@/lib/migrate-books"
import { Button } from "@/components/ui/button"

export function MigrateBooksButton() {
  const [isMigrating, setIsMigrating] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleMigrate = async () => {
    setIsMigrating(true)
    setResult(null)
    try {
      const migrationResult = await migrateBooks()
      setResult(migrationResult)

      // If migration was successful, reload the page to show the migrated books
      if (migrationResult.success) {
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (error) {
      setResult({
        success: false,
        message: "An unexpected error occurred during migration.",
      })
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <div className="mb-4">
      <Button onClick={handleMigrate} disabled={isMigrating} variant="outline" size="sm">
        {isMigrating ? "Migrating..." : "Migrate Books from localStorage"}
      </Button>

      {result && (
        <div
          className={`mt-2 text-sm p-2 rounded ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {result.message}
        </div>
      )}
    </div>
  )
}
