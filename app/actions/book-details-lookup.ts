"use server"
import { createClient } from "@supabase/supabase-js"
import { lookupEnrichment, type Enrichment } from "@/lib/book-enrichment"

// Server-side detail lookup for one of the signed-in reader's own books. Uses the server-only Google Books key,
// which (unlike the browser key) is not locked to booklogapp.com, so it also works on preview deployments.
// Read-only: returns details; the browser applies them with the existing fill-only rules.
export async function lookupOwnBookDetails(accessToken: string, bookId: string): Promise<Enrichment | null> {
  if (!accessToken || accessToken.length > 10000 || !bookId || bookId.length > 200) return null
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } })
  const { data: auth, error: authError } = await db.auth.getUser(accessToken)
  if (authError || !auth.user) return null
  const { data, error } = await db.from("books").select("title,author").eq("user_id", auth.user.id).eq("id", bookId).limit(1)
  if (error || !data?.length) return null
  return lookupEnrichment(data[0].title, data[0].author, process.env.GOOGLE_BOOKS_SERVER_KEY || undefined)
}
