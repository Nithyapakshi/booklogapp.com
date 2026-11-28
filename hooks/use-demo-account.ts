"use client"
import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"

// Whether the signed-in account is a demo library (booklogapp.com/demo/<slug>).
// null while checking; false for real readers and whenever the check fails (for example before the
// demo_accounts migration exists), so real readers always get the normal app.
export function useDemoAccount(userId: string | null | undefined): boolean | null {
  const [state, setState] = useState<{ id: string; demo: boolean } | null>(null)
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    try {
      createClientSupabaseClient().rpc("is_demo_account").then(
        ({ data, error }) => { if (!cancelled) setState({ id: userId, demo: !error && data === true }) },
        () => { if (!cancelled) setState({ id: userId, demo: false }) },
      )
    } catch {
      setState({ id: userId, demo: false })
    }
    return () => { cancelled = true }
  }, [userId])
  if (!userId) return false
  return state && state.id === userId ? state.demo : null
}
