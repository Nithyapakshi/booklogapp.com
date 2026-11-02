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
type Snapshot = SharedSnapshot & { description?: string }
export function SharedBook({token,initialBook,coded=false}:{token:string;initialBook?:Snapshot|null;coded?:boolean}) {
  const [detailOpen,setDetailOpen]=useState(false)
  const [book,setBook]=useState<Snapshot|null>(initialBook||null),[state,setState]=useState(initialBook?"":"Loading book..."),[busy,setBusy]=useState(false),[done,setDone]=useState(false)
  const {user,isLoading}=useAuth(),{books,loading,loadError,createBook}=useBooks(),auto=useRef(false),saveLock=useRef(false)
  const cleanPath=coded&&initialBook?codedSharePath(initialBook.title,token):`/s/${token}`
  const path=`${cleanPath}?save=1`
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
  async function save() {
    if(!book||busy||done||saveLock.current)return
    if(!user){window.location.href=`/signup?next=${encodeURIComponent(path)}`;return}
    if(loading||loadError){setState("Your library could not be checked yet. Please try again after it loads.");return}
    saveLock.current=true;setBusy(true);setState("")
    try {
    {
      const {data,error}=await createClientSupabaseClient().rpc("read_book_share",{p_token:token})
      if(error||!data?.[0]){setState("This recommendation is no longer available.");return}
      if(!sameBook(book,data[0])){setState("This recommendation changed. Refresh before saving.");return}
    }
    const existing=Object.values(books).flat().find(b=>sameBook(b,{title:book.title,author:book.author}))
    if(existing){setState("Already in your library. Your shelf is unchanged.");setDone(true);window.history.replaceState(null,"",cleanPath);return}
    const result=await createBook({id:crypto.randomUUID(),title:book.title,author:book.author,cover:book.cover},"queued");setDone(true);setState(result.outcome==="duplicate"?"Already in your library. Your shelf is unchanged.":"Saved to Queued.");window.history.replaceState(null,"",cleanPath)
    } catch{setState("The book was not saved. Please try again.")}
    finally{saveLock.current=false;setBusy(false)}
  }
  useEffect(()=>{if(!auto.current&&book&&user&&!isLoading&&!loading&&!loadError&&new URL(window.location.href).searchParams.get("save")==="1"){auto.current=true;void save()}},[book,user,isLoading,loading,loadError])
  return <main style={{minHeight:"100vh",padding:"32px 24px",background:"var(--bl-faf7f2)",color:"var(--bl-1a1208)",fontFamily:"DM Sans, sans-serif"}}>
    <Link href="/" style={{color:"var(--bl-c17f3e)",fontFamily:"Georgia,serif",fontSize:20}}>BookLog</Link>
    <div style={{maxWidth:460,margin:"48px auto",textAlign:"center"}}>
      {book&&<><p style={{color:"var(--bl-8a7560)",fontSize:13,marginBottom:28}}>{book.display_name} shared this with you</p>
      <button type="button" onClick={()=>setDetailOpen(true)} aria-label={`Read about ${book.title}`} className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-primary" style={{display:"block",margin:"0 auto",border:0,padding:0,background:"transparent",color:"inherit",cursor:"pointer",maxWidth:"100%"}}>
        {book.cover?<img src={book.cover} alt={book.title} style={{width:184,height:276,objectFit:"contain",margin:"0 auto 28px",filter:"drop-shadow(0 12px 18px rgba(0,0,0,.18))"}}/>:<div aria-hidden="true" style={{width:184,height:276,margin:"0 auto 28px",borderRadius:4,background:"var(--bl-f5ede0)",border:"1px solid var(--bl-e0d5c4)",display:"grid",placeItems:"center",padding:20,fontFamily:"Georgia,serif"}}>{book.title}</div>}
        <h1 style={{fontFamily:"Georgia,serif",fontSize:32,lineHeight:1.2,fontWeight:400}}>{book.title}</h1>
        <p style={{color:"var(--bl-8a7560)",fontSize:15,marginTop:10}}>{book.author}</p>
      </button>
      {done&&state&&<p role="status" className="border border-green-700/40 bg-green-50 text-green-900 dark:border-green-300/40 dark:bg-green-200/10 dark:text-green-100" style={{padding:"14px 16px",borderRadius:9,maxWidth:320,margin:"28px auto 0",textAlign:"left",fontSize:15}}><span aria-hidden="true">✓ </span>{state}</p>}
      <button type="button" disabled={busy||done||isLoading||!!user&&loading} onClick={()=>void save()} style={{padding:"14px 24px",width:"100%",maxWidth:320,background:done?"var(--bl-f5ede0)":"var(--bl-c17f3e)",color:done?"var(--bl-6b5c42)":"var(--bl-primary-ink)",border:0,borderRadius:8,marginTop:done?20:32,cursor:busy||done?"default":"pointer",opacity:busy?.7:1}}>{busy?"Saving...":done?"In your library":"Save to Queued"}</button>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}><DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto" style={{background:"var(--bl-faf7f2)",color:"var(--bl-1a1208)"}}>
        <DialogHeader><DialogTitle className="font-serif text-2xl font-normal pr-6">{book.title}</DialogTitle><DialogDescription>{book.author}</DialogDescription></DialogHeader>{book.cover&&<img src={book.cover} alt="" className="h-48 w-32 object-contain mx-auto my-3"/>}
        {book.description?<BookDescription key={token} description={book.description}/>:<p className="text-sm text-muted-foreground">A summary is not available for this book right now.</p>}
      </DialogContent></Dialog>
      </>}
      {!done&&state&&<p role="status" style={{fontSize:13,color:"var(--bl-8a7560)",marginTop:20}}>{state}</p>}
    </div>
  </main>
}
