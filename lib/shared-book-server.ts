import { cache } from "react"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { catalogForShare, isShareToken, safeCover, type SharedSnapshot } from "@/lib/shared-book"

// Use the same existing anonymous exact-token RPC, never a service-role/table read.
export const readSharedBook = cache(async (token: string) => {
  if (!isShareToken(token)) return null
  try {
    const db = await createServerSupabaseClient()
    const { data, error } = await db.rpc("read_book_share", { p_token: token }).abortSignal(AbortSignal.timeout(5000))
    if (error || !data?.[0]) return null
    const row = data[0]
    const snapshot: SharedSnapshot = { display_name: row.display_name, title: row.title, author: row.author, cover: safeCover(row.cover) }
    let timer: ReturnType<typeof setTimeout> | undefined
    const catalog = await Promise.race([catalogForShare(snapshot, process.env.GOOGLE_BOOKS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY), new Promise<{description:string;cover:string}>(resolve => {timer = setTimeout(() => resolve({description:"",cover:snapshot.cover}), 5000)})]).finally(() => clearTimeout(timer))
    return { ...snapshot, ...catalog }
  } catch { return null }
})
