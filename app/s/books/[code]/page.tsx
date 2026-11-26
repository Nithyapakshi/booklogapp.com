import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { readSharedCollection } from "@/lib/shared-collection-server"
import { tokenFromCollectionCode, collectionTitle } from "@/lib/collection-share"
import { shareSenderLine } from "@/lib/shared-book"
import { SharedCollectionView } from "@/components/shared-collection"
type Props = { params: Promise<{ code: string }> }
// Saved copies for link-preview bots, refreshed every 5 minutes so books the sender
// removes from a tab drop off soon (decision D1).
export const revalidate = 300
export async function generateStaticParams() { return [] }
// One BookLog tile for collection previews, never an arbitrary book cover (board 1).
function tileUrl() {
  const host = process.env.VERCEL_ENV === "production" || !process.env.VERCEL_URL ? "www.booklogapp.com" : process.env.VERCEL_URL
  return `https://${host}/share-booklog.png`
}
async function resolve({ params }: Props) {
  const { code } = await params
  const token = tokenFromCollectionCode(code)
  if (!token) return null
  const collection = await readSharedCollection(token)
  return collection ? { token, code, collection } : null
}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const item = await resolve(props)
  if (!item) return { title: "Shared books - BookLog", robots: { index: false, follow: false } }
  const { collection: c } = item, title = collectionTitle(c.display_name, c.sources, c.full_library), description = shareSenderLine(c.display_name)
  return { title: `${title} | BookLog`, description, robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", images: [{ url: tileUrl(), width: 600, height: 600, alt: "BookLog" }] },
    twitter: { card: "summary", title, description, images: [tileUrl()] } }
}
export default async function Page(props: Props) {
  const item = await resolve(props)
  if (!item) notFound()
  return <SharedCollectionView token={item.token} code={item.code} initial={item.collection} />
}
