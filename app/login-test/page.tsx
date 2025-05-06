"use client"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"

export default function LoginTestPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<any>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  // Function to check current session
  const checkSession = async () => {
    const supabase = createClientSupabaseClient()
    const { data, error } = await supabase.auth.getSession()
    setSessionInfo({ data, error })
  }

  // Function to handle login
  const handleLogin = async () => {
    setStatus("Logging in...")
    try {
      const supabase = createClientSupabaseClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      setStatus({ success: !error, data, error })

      if (!error && data.user) {
        // Check session immediately after login
        await checkSession()
      }
    } catch (err) {
      setStatus({ success: false, error: err })
    }
  }

  // Function to handle redirect
  const handleRedirect = (path: string) => {
    window.location.href = path
  }

  return (
    <div className="p-8 max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Login Test Page</h1>

      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Login
        </button>
      </div>

      <div className="mb-6 space-y-2">
        <button onClick={checkSession} className="w-full bg-gray-200 py-2 rounded hover:bg-gray-300">
          Check Current Session
        </button>

        <button
          onClick={() => handleRedirect("/profile")}
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          Go to Profile Page
        </button>

        <button
          onClick={() => handleRedirect("/auth-test")}
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
          Go to Auth Test Page
        </button>
      </div>

      {status && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Login Status:</h2>
          <pre className="text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}

      {sessionInfo && (
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Session Info:</h2>
          <pre className="text-xs overflow-auto whitespace-pre-wrap">{JSON.stringify(sessionInfo, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
