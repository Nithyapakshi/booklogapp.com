"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { useBooks } from "@/lib/book-context"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { codedSharePath } from "@/lib/public-share-path"
import { sameBook } from "@/lib/book-identity"
import { catalogForShare, type SharedSnapshot } from "@/lib/shared-book"
import { BookDescription } from "@/components/book-description"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { track } from "@/lib/usage"
import { rememberShareOpen } from "@/lib/signup-source"
type Snapshot = SharedSnapshot & { description?: string }
type Shelf = "reading" | "queued" | "completed" | "onHold" | "recommended"
// The reader chooses where the book goes in their own library (any shelf, On Hold included).
const SHELVES: { value: Shelf; label: string }[] = [{value:"reading",label:"Reading"},{value:"queued",label:"Queued"},{value:"completed",label:"Completed"},{value:"onHold",label:"On Hold"},{value:"recommended",label:"Recommendations"}]
const shelfLabel = (value: Shelf) => SHELVES.find(s=>s.value===value)?.label || "Queued"
const ACTION = {padding:"14px 24px",width:"100%",maxWidth:320,borderRadius:8,display:"block",margin:"12px auto 0",textDecoration:"none",fontSize:15,textAlign:"center"} as const
export function SharedBook({token,initialBook,coded=false}:{token:string;initialBook?:Snapshot|null;coded?:boolean}) {
  const [detailOpen,setDetailOpen]=useState(false),[libraryId,setLibraryId]=useState<string|null>(null)
  const [book,setBook]=useState<Snapshot|null>(initialBook||null),[state,setState]=useState(initialBook?"":"Loading book..."),[busy,setBusy]=useState(false),[done,setDone]=useState(false)
  const [step,setStep]=useState<"idle"|"auth"|"choose">("idle"),[shelf,setShelf]=useState<Shelf>("queued")
  const {user,isLoading}=useAuth(),{books,loading,loadError,createBook,reloadBooks}=useBooks(),auto=useRef(false),saveLock=useRef(false)
  const cleanPath=coded&&initialBook?codedSharePath(initialBook.title,token):`/s/${token}`
  const path=`${cleanPath}?save=1`
  // Signup credit for this link (lib/signup-source.ts), and one view per signed-in reader per page load.
  useEffect(()=>{rememberShareOpen("book",token)},[token])
  const viewed=useRef(false)
  useEffect(()=>{if(!user||viewed.current)return;viewed.current=true;track("share.book_viewed",{share:token})},[user?.id,token]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(initialBook)return;let cancelled=false;(async()=>{
    try {
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)){setState("This sharing link is not available.");return}
    const {data,error}=await createClientSupabaseClient().rpc("read_book_share",{p_token:token})
    if(cancelled)return
    if(error){setState("This book could not be loaded. Refresh to try again.");return}
    if(!data?.[0]){setState("This sharing link is not available.");return}
    setBook(data[0]);setState("")
    const catalog=await catalogForShare(data[0]);if(!cancelled)setBook({...data[0],...catalog})
    } catch { if(!cancelled)setState("This book could not be loaded. Refresh to try again.") }
  })();return()=>{cancelled=true}},[token,initialBook])
  // A server-restricted/missing catalog credential must not suppress browser retry.
  useEffect(()=>{if(!initialBook || initialBook.description)return;let cancelled=false;
    void catalogForShare(initialBook).then(catalog=>{if(!cancelled)setBook({...initialBook,...catalog})})
    return()=>{cancelled=true}
  },[initialBook])
  // Books already in the reader's library are tagged up front and never offered again.
  const inLibrary=book&&user&&!loading&&!loadError?Object.values(books).flat().find(b=>sameBook(b,{title:book.title,author:book.author})):undefined
  // Add opens the "Choose where" step. Signing in or signing up never saves anything by itself.
  function start() {
    if(!book||busy||done)return
    if(!user){setStep("auth");track("share.recipient_auth_prompt");return}
    if(loading||loadError)return
    if(inLibrary){setLibraryId(inLibrary.id);return}
    setStep("choose");track("share.recipient_choose_opened")
  }
  async function save() {
    if(!book||busy||done||saveLock.current)return
    if(!user){setStep("auth");return}
    if(loading||loadError){setState("Your library could not be checked yet. Please try again after it loads.");return}
    saveLock.current=true;setBusy(true);setState("")
    try {
    {
      const {data,error}=await createClientSupabaseClient().rpc("read_book_share",{p_token:token})
      if(error||!data?.[0]){setState("This recommendation is no longer available.");return}
      if(!sameBook(book,data[0])){setState("This recommendation changed. Refresh before saving.");return}
    }
    const existing=Object.values(books).flat().find(b=>sameBook(b,{title:book.title,author:book.author}))
    if(existing){setLibraryId(existing.id);setState("Already in your library. Your shelf is unchanged.");setDone(true);window.history.replaceState(null,"",cleanPath);return}
    const result=await createBook({id:crypto.randomUUID(),title:book.title,author:book.author,cover:book.cover},shelf);setLibraryId(result.books.find(b=>sameBook(b,book))?.id||null);setDone(true);setStep("idle");if(result.outcome!=="duplicate")track("book.added_from",{source:"shared_book",shelf,share:token});setState(result.outcome==="duplicate"?"Already in your library. Your shelf is unchanged.":`Added to your ${shelfLabel(shelf)}.`);window.history.replaceState(null,"",cleanPath)
    } catch{setState("The book was not saved. Please try again.")}
    finally{saveLock.current=false;setBusy(false)}
  }
  useEffect(()=>{if(!auto.current&&book&&user&&!isLoading&&!loading&&!loadError&&new URL(window.location.href).searchParams.get("save")==="1"){auto.current=true;start()}},[book,user,isLoading,loading,loadError])
  return <main style={{minHeight:"100vh",padding:"32px 24px",background:"var(--bl-faf7f2)",color:"var(--bl-1a1208)",fontFamily:"DM Sans, sans-serif"}}>
    <Link href="/" style={{color:"var(--bl-c17f3e)",fontFamily:"Georgia,serif",fontSize:20}}>BookLog</Link>
    <div style={{maxWidth:460,margin:"48px auto",textAlign:"center"}}>
      {book&&<><p style={{color:"var(--bl-8a7560)",fontSize:13,marginBottom:28}}>{book.display_name} has shared this with you</p>
      <button type="button" onClick={()=>setDetailOpen(true)} aria-label={`Read about ${book.title}`} className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-primary" style={{display:"block",margin:"0 auto",border:0,padding:0,background:"transparent",color:"inherit",cursor:"pointer",maxWidth:"100%"}}>
        {book.cover?<img src={book.cover} alt={book.title} style={{width:184,height:276,objectFit:"contain",margin:"0 auto 28px",filter:"drop-shadow(0 12px 18px rgba(0,0,0,.18))"}}/>:<div aria-hidden="true" style={{width:184,height:276,margin:"0 auto 28px",borderRadius:4,background:"var(--bl-f5ede0)",border:"1px solid var(--bl-e0d5c4)",display:"grid",placeItems:"center",padding:20,fontFamily:"Georgia,serif"}}>{book.title}</div>}
        <h1 style={{fontFamily:"Georgia,serif",fontSize:32,lineHeight:1.2,fontWeight:400}}>{book.title}</h1>
        <p style={{color:"var(--bl-8a7560)",fontSize:15,marginTop:10}}>{book.author}</p>
      </button>
      {inLibrary&&!done&&<p style={{marginTop:14}}><span style={{display:"inline-block",fontSize:12,border:"1px solid var(--bl-e0d5c4)",borderRadius:6,padding:"3px 8px",color:"var(--bl-6b5c42)"}}>✓ In your library</span></p>}
      {done&&state&&<p role="status" className="border border-green-700/40 bg-green-50 text-green-900 dark:border-green-300/40 dark:bg-green-200/10 dark:text-green-100" style={{padding:"14px 16px",borderRadius:9,maxWidth:320,margin:"28px auto 0",textAlign:"left",fontSize:15}}><span aria-hidden="true">✓ </span>{state}</p>}
      {done&&libraryId?<Link href={`/books?show=${encodeURIComponent(libraryId)}`} style={{...ACTION,background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)",marginTop:20}}>View in my library</Link>
      :inLibrary?<><button type="button" disabled style={{...ACTION,border:0,background:"var(--bl-f5ede0)",color:"var(--bl-6b5c42)",marginTop:28}}>Already in your library</button><Link href={`/books?show=${encodeURIComponent(inLibrary.id)}`} style={{...ACTION,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-1a1208)"}}>View in my library</Link></>
      :step==="auth"?<section aria-label="Keep this book" style={{marginTop:28}}><h2 style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:400}}>Keep this book in your BookLog</h2>
        <Link href={`/signup?next=${encodeURIComponent(path)}`} style={{...ACTION,background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)",marginTop:18}}>Create an account</Link>
        <Link href={`/login?next=${encodeURIComponent(path)}`} style={{...ACTION,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-1a1208)"}}>Sign in</Link>
        <button type="button" onClick={()=>setStep("idle")} style={{...ACTION,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-1a1208)",cursor:"pointer"}}>Back to the book</button></section>
      :step==="choose"?<section aria-label="Choose where" style={{marginTop:28,maxWidth:320,marginLeft:"auto",marginRight:"auto",textAlign:"left"}}><h2 style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:400}}>Add 1 book</h2>
        <label style={{display:"block",fontSize:13,fontWeight:600,color:"var(--bl-6b5c42)",marginTop:14}}>Add to
          <select value={shelf} onChange={e=>setShelf(e.target.value as Shelf)} style={{display:"block",width:"100%",height:46,marginTop:6,borderRadius:8,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-1a1208)",padding:"0 12px",fontSize:15,fontWeight:400}}>{SHELVES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
        <button type="button" disabled={busy} onClick={()=>void save()} style={{...ACTION,border:0,background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)",marginTop:16,cursor:busy?"default":"pointer",opacity:busy?.7:1}}>{busy?"Adding...":`Add to ${shelfLabel(shelf)}`}</button>
        <button type="button" disabled={busy} onClick={()=>setStep("idle")} style={{...ACTION,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-1a1208)",cursor:"pointer"}}>Cancel</button></section>
      :!done&&<button type="button" disabled={busy||isLoading||!!user&&(loading||!!loadError)} onClick={start} style={{...ACTION,border:0,background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)",marginTop:32,cursor:"pointer",opacity:busy||isLoading||!!user&&loading?.7:1}}>{!!user&&loading?"Checking your library...":"Add to my BookLog"}</button>}
      {!!user&&loadError&&!done&&<p role="alert" style={{fontSize:13,color:"var(--bl-8a7560)",marginTop:14}}>We could not check your library. <button type="button" onClick={()=>void reloadBooks()} style={{border:0,background:"none",color:"var(--bl-c17f3e)",textDecoration:"underline",cursor:"pointer"}}>Try again</button></p>}
      {!done&&step==="idle"&&!inLibrary&&<p style={{fontSize:12,color:"var(--bl-a8927a)",marginTop:10}}>Tap the cover to read a summary</p>}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto" style={{background:"var(--bl-faf7f2)",color:"var(--bl-1a1208)"}}>
        <DialogHeader><DialogTitle className="font-serif text-2xl font-normal pr-6">{book.title}</DialogTitle><DialogDescription>{book.author}</DialogDescription></DialogHeader>{book.cover&&<img src={book.cover} alt="" className="h-48 w-32 object-contain mx-auto my-3"/>}
        {book.description?<BookDescription key={token} description={book.description}/>:<p className="text-sm text-muted-foreground">A summary is not available for this book right now.</p>}
      </DialogContent></Dialog>
      </>}
      {!done&&state&&<p role="status" style={{fontSize:13,color:"var(--bl-8a7560)",marginTop:20}}>{state}</p>}
    </div>
  </main>
}
