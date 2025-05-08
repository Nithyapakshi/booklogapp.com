'use client'

console.log("🚨 reset-password page mounted (top-level)")

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenChecked, setTokenChecked] = useState(false)

  useEffect(() => {
    console.log("🔍 Hash fragment:", window.location.hash)
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.auth.getSession()
  
      if (error) {
        setError("Failed to get session: " + error.message)
      } else if (!data.session) {
        setError("No valid session found. Your reset link may have expired.")
      }
  
      setTokenChecked(true)
    }, 300)
  
    return () => clearTimeout(timer)
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 rounded-lg shadow-md border">
      <h1 className="text-xl font-semibold mb-4">Reset Password</h1>

      {!tokenChecked ? (
        <p>Checking reset token...</p>
      ) : error ? (
        <p className="text-red-600 mb-4">{error}</p>
      ) : success ? (
        <p className="text-green-600">Password updated successfully</p>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <Input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Reset Password'}
          </Button>
        </form>
      )}
    </div>
  )
}
