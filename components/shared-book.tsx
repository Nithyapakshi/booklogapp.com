"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { useBooks } from "@/lib/book-context"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { sameBook } from "@/lib/book-identity"
type Snapshot={display_name:string;title:string;author:string;cover:string}
export function SharedBook({token}:{token:string}) {
  const [book,setBook]=useState<Snapshot|null>(null),[state,setState]=useState("Loading book..."),[busy,setBusy]=useState(false),[done,setDone]=useState(false)
  const {user,isLoading}=useAuth(),{books,loading,loadError,createBook}=useBooks(),auto=useRef(false)
  const path=`/s/${token}?save=1`
  useEffect(()=>{let cancelled=false;(async()=>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)){setState("This sharing link is not available.");return}
    const {data,error}=await createClientSupabaseClient().rpc("read_book_share",{p_token:token})
    if(cancelled)return
    if(error){setState("This book could not be loaded. Refresh to try again.");return}
    if(!data?.[0]){setState("This sharing link is not available.");return}
    setBook(data[0]);setState("")
  })();return()=>{cancelled=true}},[token])
  async function save() {
    if(!book||busy||done)return
    if(!user){window.location.href=`/signup?next=${encodeURIComponent(path)}`;return}
    if(loading||loadError){setState("Your library could not be checked yet. Please try again after it loads.");return}
    const existing=Object.values(books).flat().find(b=>sameBook(b,{title:book.title,author:book.author}))
    if(existing){setState("Already in your library. Your shelf is unchanged.");setDone(true);return}
    setBusy(true);setState("")
    try {const result=await createBook({id:crypto.randomUUID(),title:book.title,author:book.author,cover:book.cover},"queued");setDone(true);setState(result.outcome==="duplicate"?"Already in your library. Your shelf is unchanged.":"Saved to Queued.");window.history.replaceState(null,"",`/s/${token}`)}
    catch{setState("The book was not saved. Please try again.")}
    finally{setBusy(false)}
  }
  useEffect(()=>{if(!auto.current&&book&&user&&!isLoading&&!loading&&!loadError&&new URL(window.location.href).searchParams.get("save")==="1"){auto.current=true;void save()}},[book,user,isLoading,loading,loadError])
  return <main style={{minHeight:"100vh",padding:"32px 24px",background:"var(--bl-faf7f2)",color:"var(--bl-1a1208)",fontFamily:"DM Sans, sans-serif"}}>
    <Link href="/" style={{color:"var(--bl-c17f3e)",fontFamily:"Georgia,serif",fontSize:20}}>BookLog</Link>
    <div style={{maxWidth:460,margin:"48px auto",textAlign:"center"}}>
      {book&&<><p style={{color:"var(--bl-8a7560)",fontSize:13}}>{book.display_name} shared this with you</p>{book.cover&&<img src={book.cover} alt={book.title} style={{width:150,height:225,objectFit:"contain",margin:"24px auto"}}/>}<h1 style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:400}}>{book.title}</h1><p style={{color:"var(--bl-8a7560)"}}>{book.author}</p><button type="button" disabled={busy||done||isLoading||!!user&&loading} onClick={()=>void save()} style={{padding:"12px 24px",background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)",border:0,borderRadius:8,marginTop:24,cursor:"pointer"}}>{busy?"Saving...":done?"In your library":"Save to Queued"}</button>{!user&&<p style={{fontSize:12,color:"var(--bl-8a7560)"}}>New to BookLog? Save this book after signing up. <Link href={`/login?next=${encodeURIComponent(path)}`}>Already have an account?</Link></p>}</>}
      {state&&<p role="status" style={{fontSize:13,color:"var(--bl-8a7560)",marginTop:20}}>{state}</p>}
    </div>
  </main>
}
