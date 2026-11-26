"use client"
import { useRef, useState } from "react"
import Link from "next/link"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { codedSharePath } from "@/lib/public-share-path"
import { safeCover, shareSenderLine } from "@/lib/shared-book"
import { ShareButton } from "@/components/share-button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { track } from "@/lib/usage"

type ShareBook = { id: string; title: string; author: string; cover?: string }
type Ready = { key: string; url: string; name: string }

export function BookShareControls({book}:{book:ShareBook}) {
  const saved=useRef<Ready|null>(null),pending=useRef<{key:string;promise:Promise<Ready>}|null>(null)
  const [open,setOpen]=useState(false),[ready,setReady]=useState<Ready|null>(null),[error,setError]=useState(""),[copied,setCopied]=useState(false)
  const key=JSON.stringify([book.id,book.title,book.author,book.cover])
  const cover=safeCover(book.cover?.replace(/^http:\/\//,"https://"))
  async function create(): Promise<Ready> {
    const db=createClientSupabaseClient(), {data:{user}}=await db.auth.getUser()
    if(!user) throw new Error("Log in to share a book.")
    const {data:profile,error:profileError}=await db.from("profiles").select("name").eq("user_id",user.id).single()
    const name=profile?.name?.trim()
    if(profileError||!name) throw new Error("Add your display name in Settings before sharing. Your email is never used.")
    const {data,error}=await db.from("book_shares").insert({owner_id:user.id,display_name:name.slice(0,80),title:book.title,author:book.author,cover}).select("token").single()
    if(error||!data) throw new Error("The sharing link was not created. Please try again.")
    const url=`${window.location.origin}${codedSharePath(book.title,data.token)}`
    // Load the new page once in the background so its saved copy exists before the link is pasted.
    void fetch(url,{credentials:"omit"}).catch(()=>{})
    return {key,url,name:name.slice(0,80)}
  }
  // The link is made as soon as the popup opens, so WhatsApp and Copy link act on the first tap.
  function prepare() {
    if(saved.current?.key===key){setReady(saved.current);return}
    setReady(null)
    if(pending.current?.key!==key) pending.current={key,promise:create()}
    const mine=pending.current.promise
    mine.then(r=>{saved.current=r;if(r.key===key)setReady(r)}).catch(e=>{setError(e instanceof Error?e.message:"The sharing link was not created. Please try again.")}).finally(()=>{if(pending.current?.promise===mine)pending.current=null})
  }
  function openShare(){setOpen(true);setCopied(false);setError("");track("share.book_opened");prepare()}
  async function copy(){
    if(!ready)return
    try{await navigator.clipboard.writeText(ready.url);setCopied(true);setError("");track("share.book_copied")}
    catch{setError("Could not copy the link. Please try again.")}
  }
  const actionStyle={flex:1,height:46,borderRadius:10,fontSize:15,fontWeight:600,display:"inline-flex",alignItems:"center",justifyContent:"center",textDecoration:"none"} as const
  return <>
    <div className="book-share-header"><div className="-mt-2 flex min-h-11 items-center justify-end pr-11"><ShareButton onClick={openShare}/></div></div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-24px)] grid-cols-[minmax(0,1fr)] overflow-y-auto rounded-lg p-5 sm:max-w-[440px] sm:p-6" style={{background:"var(--bl-faf7f2)",color:"var(--bl-1a1208)"}}>
        <DialogHeader><DialogTitle className="font-serif text-2xl font-normal">Share this book</DialogTitle><DialogDescription className="sr-only">Send a link to this book on WhatsApp or copy it.</DialogDescription></DialogHeader>
        <div className="flex items-center gap-3">
          {cover?<img src={cover} alt="" className="h-16 w-11 shrink-0 rounded-sm object-cover"/>:<div aria-hidden="true" className="h-16 w-11 shrink-0 rounded-sm" style={{background:"var(--bl-f5ede0)",border:"1px solid var(--bl-e0d5c4)"}}/>}
          <div className="min-w-0"><p className="font-semibold leading-snug">{book.title}</p><p className="text-sm" style={{color:"var(--bl-8a7560)"}}>{book.author}</p></div>
        </div>
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{color:"var(--bl-6b5c42)"}}>What they will see</p>
          <div className="rounded-lg p-2" style={{background:"#e9e2d6"}}>
            <div className="flex items-center gap-2 rounded-md p-1.5" style={{background:"#d9fdd3",color:"#1a1208"}}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded" style={{background:"#c7ecc0"}}>{cover?<img src={cover} alt="" className="h-11 w-8 object-cover"/>:<span className="font-serif text-lg font-bold">B</span>}</div>
              <div className="min-w-0 text-[12.5px] leading-snug"><p className="truncate font-bold">{book.title} · {book.author}</p><p style={{color:"#3d4a3b"}}>{ready?shareSenderLine(ready.name):"Preparing the link..."}</p><p className="text-[11px]" style={{color:"#55624f"}}>booklogapp.com</p></div>
            </div>
          </div>
        </div>
        <p className="text-[12.5px] leading-relaxed" style={{color:"var(--bl-6b5c42)"}}>Anyone with the link sees your name and this book. Your private notes and rating are never shared.</p>
        {error&&<p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}{/display name/i.test(error)&&<> <Link href="/settings" className="underline">Go to Settings</Link></>}</p>}
        <div className="flex min-w-0 gap-2.5">
          <button type="button" disabled={!ready} onClick={()=>void copy()} style={{...actionStyle,border:0,background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)",opacity:ready?1:.6,cursor:ready?"pointer":"default"}}>{copied?"✓ Link copied":ready||error?"Copy link":"Preparing..."}</button>
          {ready
            ? <a href={`https://wa.me/?text=${encodeURIComponent(ready.url)}`} target="_blank" rel="noopener noreferrer" onClick={()=>track("share.book_whatsapp")} style={{...actionStyle,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-1a1208)"}}>WhatsApp</a>
            : <button type="button" disabled style={{...actionStyle,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-8a7560)",opacity:.6}}>WhatsApp</button>}
        </div>
      </DialogContent>
    </Dialog>
  </>
}
