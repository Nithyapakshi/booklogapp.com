"use client"

import { useAuth } from "@/components/auth/auth-provider"
import { useState } from "react"

export function DebugUserData() {
  const { user } = useAuth()
  const [showData, setShowData] = useState(false)

  if (!showData) {
    return (
      <button
        onClick={() => setShowData(true)}
        className="fixed bottom-4 right-4 bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs"
      >
        Debug User
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border shadow-lg p-4 rounded max-w-md max-h-96 overflow-auto">
      <div className="flex justify-between mb-2">
        <h3 className="font-bold">User Data Structure</h3>
        <button onClick={() => setShowData(false)} className="text-gray-500 hover:text-gray-700">
          Close
        </button>
      </div>
      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(user, null, 2)}</pre>
    </div>
  )
}
