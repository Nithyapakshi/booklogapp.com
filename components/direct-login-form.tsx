"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@supabase/supabase-js"

export function DirectLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null)

  // First, check if the user has any stale auth data and clear it
  useEffect(() => {
    // Clear any stale auth data before attempting login
    localStorage.removeItem("booklog-user")
    localStorage.removeItem("booklog-auth")
    localStorage.removeItem("supabase-auth-token")
    localStorage.removeItem("sb-access-token")
    localStorage.removeItem("sb-refresh-token")
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      // Create a fresh Supabase client for this login
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase environment variables")
      }

      // Create a new client with explicit localStorage persistence
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          storage: localStorage, // Explicitly use localStorage
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })

      // Attempt login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage({ text: `Login error: ${error.message}`, type: "error" })
        return
      }

      if (data.user) {
        // Store user data in localStorage as backup
        localStorage.setItem("booklog-user", JSON.stringify(data.user))

        setMessage({ text: "Login successful! Redirecting...", type: "success" })

        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = "/books"
        }, 1500)
      }
    } catch (error) {
      setMessage({
        text: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {message && (
        <div
          className={`p-4 rounded-md ${
            message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Logging in..." : "Log in"}
      </Button>
    </form>
  )
}
