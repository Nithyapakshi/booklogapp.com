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

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const access_token = hashParams.get('access_token')

    if (access_token) {
      supabase.auth.exchangeCodeForSession(access_token)
        .then(({ error }) => {
          if (error) setError(error.message)
        })
    } else {
      setError("Reset token not found.")
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
    <div>
      <h1>Reset Password</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success ? (
        <p>Password updated successfully</p>
      ) : (
        <form onSubmit={handleReset}>
          <Input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Reset Password'}
          </Button>
        </form>
      )}
    </div>
  )
}
