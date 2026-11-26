import { cache } from "react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { isShareToken } from "@/lib/shared-book"
import { toCollection } from "@/lib/shared-collection"
export type { SharedCollection, SharedCollectionItem } from "@/lib/shared-collection"

// Exact-token read through the anonymous RPC only (never a table or service-role read).
// A failed read throws, so an error page is never cached as "not found".
export const readSharedCollection = cache(async (token: string) => {
  if (!isShareToken(token)) return null
  const db = await createServerSupabaseClient()
  const { data, error } = await db.rpc("read_collection_share", { p_token: token }).abortSignal(AbortSignal.timeout(5000))
  if (error) throw new Error("Shared books could not be read")
  return toCollection(data)
})
