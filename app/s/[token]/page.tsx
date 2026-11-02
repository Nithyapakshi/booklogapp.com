import type { Metadata } from "next"
import { SharedBook } from "@/components/shared-book"
import { readSharedBook } from "@/lib/shared-book-server"
type Props = { params: Promise<{ token: string }> }
// Shares are fixed snapshots: build each page on its first visit and serve the saved copy after that,
// so link-preview bots (WhatsApp, X) never wait for a sleeping server.
export const revalidate = 86400
export async function generateStaticParams() { return [] }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const book = await readSharedBook(token)
  if (!book) return { title: "A book shared with you - BookLog", robots: { index: false, follow: false } }
  const title = `${book.title} - ${book.author} | BookLog`
  return { title, description: `${book.title} by ${book.author}. Save it to your BookLog queue.`, robots: { index: false, follow: false },
    openGraph: { title, description: `${book.title} by ${book.author}`, type: "website", images: book.cover ? [{ url: book.cover, alt: book.title }] : [] },
    twitter: { card: "summary_large_image", title, images: book.cover ? [book.cover] : [] } }
}
export default async function Page({ params }: Props) {
  const { token } = await params
  return <SharedBook token={token} initialBook={await readSharedBook(token)} />
}
