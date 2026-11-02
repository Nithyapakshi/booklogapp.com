import { cache } from "react"
import { unstable_cache } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { catalogForShare, isShareToken, safeCover, type SharedCatalog, type SharedSnapshot } from "@/lib/shared-book"

// Link-preview bots (WhatsApp, X) give up after a few seconds, so the page must answer from the
// stored snapshot. The Google lookup only runs when an older snapshot has no cover, is capped,
// and successful results are remembered for a day. The summary itself loads in the browser.
const COVER_LOOKUP_MS = 2500

class EmptyCatalog extends Error {}
// Throwing keeps failed or empty lookups out of the cache, so a Google outage is never remembered.
const rememberedCatalog = unstable_cache(async (title: string, author: string): Promise<SharedCatalog> => {
  const catalog = await catalogForShare({ title, author, cover: "" }, process.env.GOOGLE_BOOKS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY)
  if (!catalog.cover && !catalog.description) throw new EmptyCatalog()
  return catalog
}, ["shared-book-catalog-v1"], { revalidate: 86400 })

async function coverFallback(snapshot: SharedSnapshot): Promise<SharedCatalog | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      rememberedCatalog(snapshot.title, snapshot.author),
      new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), COVER_LOOKUP_MS) }),
    ])
  } catch { return null } finally { clearTimeout(timer) }
}

// Use the same existing anonymous exact-token RPC, never a service-role/table read.
// Share pages are cached as finished copies (see the page files), so a failed read throws instead of
// returning "not found": an error is retried on the next visit, a cached empty page would stick.
export const readSharedBook = cache(async (token: string) => {
  if (!isShareToken(token)) return null
  const db = await createServerSupabaseClient()
  const { data, error } = await db.rpc("read_book_share", { p_token: token }).abortSignal(AbortSignal.timeout(5000))
  if (error) throw new Error("Shared book could not be read")
  if (!data?.[0]) return null
  const row = data[0]
  const snapshot: SharedSnapshot = { display_name: row.display_name, title: row.title, author: row.author, cover: safeCover(row.cover) }
  if (snapshot.cover) return snapshot
  const catalog = await coverFallback(snapshot)
  return catalog ? { ...snapshot, cover: catalog.cover, description: catalog.description } : snapshot
})
