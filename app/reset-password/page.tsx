'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Step 1: Parse and apply token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const access_token = params.get('access_token')
  
    if (access_token) {
      supabase.auth.exchangeCodeForSession(access_token)
        .then(({ error }) => {
          if (error) setError(error.message)
        })
    } else {
      setError("Reset token not found.")
    }
  }, [])  

  // Step 2: Update password
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-semibold mb-4">Reset Your Password</h2>
      <form onSubmit={handleReset} className="space-y-4">
        <Input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading || password.length < 6}>
          {loading ? 'Resetting...' : 'Set New Password'}
        </Button>
      </form>

      {success && <p className="text-green-600 mt-4">Password updated! Redirecting...</p>}
      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  )
}
