'use client'

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
    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.substring(1))
    const access_token = hashParams.get('access_token')

    if (access_token) {
      supabase.auth.exchangeCodeForSession(access_token)
        .then(({ error }) => {
          if (error) {
            setError("Session error: " + error.message)
          }
          setTokenChecked(true)
        })
        .catch((err) => {
          setError("Token exchange failed: " + String(err))
          setTokenChecked(true)
        })
    } else {
      setError("Reset token not found in URL.")
      setTokenChecked(true)
    }
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
