import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { readSharedBook } from "@/lib/shared-book-server"
import { SharedBook } from "@/components/shared-book"
import { publicBookSlug, RESERVED_SHARE_SLUGS, tokenFromShareCode } from "@/lib/public-share-path"
type Props={params:Promise<{bookSlug:string;shareCode:string}>}
// Shares are fixed snapshots: build each page on its first visit and serve the saved copy after that,
// so link-preview bots (WhatsApp, X) never wait for a sleeping server.
export const revalidate = 86400
export async function generateStaticParams() { return [] }
async function resolve({params}:Props){
  const {bookSlug:slug,shareCode:code}=await params
  if(!/^[a-z0-9][a-z0-9-]{0,199}$/.test(slug)||RESERVED_SHARE_SLUGS.some(s=>slug===s||slug.startsWith(s+"-")))return null
  const token=tokenFromShareCode(code);if(!token)return null
  const book=await readSharedBook(token)
  // The title cannot select a different snapshot or impersonate another book.
  return book&&publicBookSlug(book.title)===slug?{book,token}:null
}
export async function generateMetadata(props:Props):Promise<Metadata>{const item=await resolve(props);if(!item)return{title:"Book not found - BookLog",robots:{index:false,follow:false}};const {book}=item,title=`${book.title} - ${book.author} | BookLog`;return{title,description:`${book.title} by ${book.author}`,robots:{index:false,follow:false},openGraph:{title,type:"website",images:book.cover?[{url:book.cover,alt:book.title}]:[]},twitter:{card:"summary_large_image",title,images:book.cover?[book.cover]:[]}}}
export default async function Page(props:Props){const item=await resolve(props);if(!item)notFound();return <SharedBook token={item.token} initialBook={item.book} coded/>}
