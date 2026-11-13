"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { isUnsubscribeToken } from "@/lib/email-unsubscribe"

export type UnsubscribeResult = "done" | "invalid" | "failed"

// Exact-token RPC only. No table access, no sign-in, nothing in the library is touched.
export async function unsubscribeFromEmails(token: string): Promise<UnsubscribeResult> {
  if (!isUnsubscribeToken(token)) return "invalid"
  try {
    const db = await createServerSupabaseClient()
    const { data, error } = await db.rpc("unsubscribe_email", { p_token: token }).abortSignal(AbortSignal.timeout(5000))
    if (error) return "failed"
    return data === true ? "done" : "invalid"
  } catch {
    return "failed"
  }
}
