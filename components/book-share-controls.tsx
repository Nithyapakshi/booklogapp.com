"use client"
import { useRef } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { ShareControls } from "@/components/share-controls"
export function BookShareControls({book}:{book:{id:string;title:string;author:string;cover?:string}}) {
  const saved=useRef<{key:string;url:string}|null>(null)
  async function getUrl() {
    const key=JSON.stringify([book.id,book.title,book.author,book.cover])
    if(saved.current?.key===key) return saved.current.url
    const db=createClientSupabaseClient(), {data:{user}}=await db.auth.getUser()
    if(!user) throw new Error("Log in to share a book.")
    const {data:profile,error:profileError}=await db.from("profiles").select("name").eq("user_id",user.id).single()
    const name=profile?.name?.trim()
    if(profileError||!name) throw new Error("Add your display name in Settings before sharing. Your email is never used.")
    const {data,error}=await db.from("book_shares").insert({owner_id:user.id,display_name:name.slice(0,80),title:book.title,author:book.author,cover:book.cover?.startsWith("https://")?book.cover:""}).select("token").single()
    if(error||!data) throw new Error("The sharing link was not created. Please try again.")
    const url=`${window.location.origin}/s/${data.token}`
    saved.current={key,url};return url
  }
  return <div><ShareControls getUrl={getUrl} label="book"/><p style={{fontSize:11,color:"var(--bl-8a7560)"}}>Shares this book and your Settings display name, not your library, notes or rating. Anyone with the link can view it.</p></div>
}
