"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Book } from "@/types"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { safeCover, shareSenderLine } from "@/lib/shared-book"
import { SHARE_SOURCES, FULL_LIBRARY, orderSources, sourceLabel, chooserSummary, collectionTitle, collectionPath, type ShareSource } from "@/lib/collection-share"
import { DisplayNameField } from "@/components/display-name-field"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { track } from "@/lib/usage"

type Ready = { sig: string; url: string }
export type SavedChoice = { label: string; showsOnHold: boolean } | null

// One compact popup (boards 3 and 9): what to share, which books, preview, Copy link / WhatsApp.
// Each link is a fixed snapshot of the ticked books (decision D1). On Hold is never offered.
export function CollectionSharePopup({ open, onClose, books, initialSources, savedChoice }:{
  open: boolean; onClose: () => void; books: Record<string, Book[]>; initialSources: ShareSource[]; savedChoice: SavedChoice
}) {
  const [sources,setSources]=useState<ShareSource[]>(initialSources),[chooserOpen,setChooserOpen]=useState(false)
  const [tab,setTab]=useState<ShareSource>(orderSources(initialSources)[0]||"recommended")
  const [unticked,setUnticked]=useState<Set<string>>(new Set())
  const [name,setName]=useState<string|null>(null),[needsName,setNeedsName]=useState(false)
  const [ready,setReady]=useState<Ready|null>(null),[error,setError]=useState(""),[copied,setCopied]=useState(false)
  const cache=useRef(new Map<string,Promise<string>>())

  useEffect(()=>{ if(!open)return
    setSources(initialSources);setTab(orderSources(initialSources)[0]||"recommended");setUnticked(new Set());setChooserOpen(false);setCopied(false);setError("")
    track("share.collection_opened",{tabs:initialSources.length})
    let cancelled=false
    ;(async()=>{ try {
      const db=createClientSupabaseClient(),{data:{user}}=await db.auth.getUser()
      if(!user||cancelled)return
      const {data}=await db.from("profiles").select("name").eq("user_id",user.id).single()
      const n=data?.name?.trim()||""
      if(!cancelled){setName(n);setNeedsName(!n)}
    } catch { if(!cancelled)setError("Sharing could not be prepared. Close and try again.") } })()
    return()=>{cancelled=true}
  },[open]) // eslint-disable-line react-hooks/exhaustive-deps

  const ordered=orderSources(sources)
  const shelf=(s:ShareSource)=>books[s]||[]
  const itemKey=(s:ShareSource,b:Book)=>`${s}\u0000${b.id}`
  const payload=useMemo(()=>ordered.flatMap(s=>shelf(s).filter(b=>!unticked.has(itemKey(s,b))).map(b=>({source:s,book_id:b.id}))),[sources,unticked,books]) // eslint-disable-line react-hooks/exhaustive-deps
  const allFour=FULL_LIBRARY.every(s=>sources.includes(s))
  const fullLibrary=allFour&&unticked.size===0&&payload.length>0
  const sig=JSON.stringify([fullLibrary,payload])
  const title=name?collectionTitle(name,ordered,fullLibrary):""

  function create(): Promise<string> {
    const hit=cache.current.get(sig); if(hit)return hit
    const p=(async()=>{
      const db=createClientSupabaseClient()
      const {data,error}=await db.rpc("create_collection_share",{p_sources:ordered,p_full_library:fullLibrary,p_books:payload})
      if(error||!data){const m=error?.message||"";if(/display name/i.test(m))setNeedsName(true);throw new Error(/changed/i.test(m)?"Some books have changed. Close and open Share again.":/display name/i.test(m)?"Add your name to share.":"The sharing link was not created. Please try again.")}
      const url=`${window.location.origin}${collectionPath(String(data))}`
      void fetch(url,{credentials:"omit"}).catch(()=>{})
      track("share.collection_created",{tabs:ordered.length,books:payload.length,full_library:fullLibrary})
      return url
    })()
    cache.current.set(sig,p);p.catch(()=>cache.current.delete(sig))
    return p
  }
  // The link is made when the popup opens and again shortly after the selection settles,
  // so Copy link and WhatsApp work on the first tap. An unchanged selection reuses its link.
  useEffect(()=>{ if(!open||!name||needsName||payload.length===0){setReady(null);return}
    setReady(null);setCopied(false)
    const mySig=sig,t=setTimeout(()=>{create().then(url=>{setReady(r=>mySig===sigRef.current?{sig:mySig,url}:r);setError("")}).catch(e=>{if(mySig===sigRef.current)setError(e instanceof Error?e.message:"The sharing link was not created. Please try again.")})},cache.current.has(sig)?0:500)
    return()=>clearTimeout(t)
  },[open,name,needsName,sig]) // eslint-disable-line react-hooks/exhaustive-deps
  const sigRef=useRef(sig);sigRef.current=sig
  const live=ready&&ready.sig===sig?ready:null

  function toggleSource(s:ShareSource){setSources(prev=>{const next=prev.includes(s)?prev.filter(x=>x!==s):[...prev,s];if(!next.includes(tab))setTab(orderSources(next)[0]||s);return next})}
  function toggleFull(){setSources(prev=>{const next=FULL_LIBRARY.every(s=>prev.includes(s))?["recommended" as ShareSource]:[...FULL_LIBRARY];setTab(orderSources(next)[0]);return next})}
  function setTabTicks(on:boolean){setUnticked(prev=>{const n=new Set(prev);for(const b of shelf(tab)){on?n.delete(itemKey(tab,b)):n.add(itemKey(tab,b))}return n})}
  function toggleBook(b:Book){setUnticked(prev=>{const n=new Set(prev),k=itemKey(tab,b);n.has(k)?n.delete(k):n.add(k);return n})}
  async function copy(){ if(!live)return
    try{await navigator.clipboard.writeText(live.url);setCopied(true);track("share.collection_copied",{books:payload.length})}catch{setError("Could not copy the link. Please try again.")} }

  const action={flex:1,height:46,borderRadius:10,fontSize:15,fontWeight:600,display:"inline-flex",alignItems:"center",justifyContent:"center",textDecoration:"none"} as const
  const box=(on:boolean)=><span aria-hidden="true" className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] text-[13px]" style={{border:`1.5px solid ${on?"var(--bl-c17f3e)":"var(--bl-c9b9a0, #c9b9a0)"}`,background:on?"var(--bl-c17f3e)":"var(--bl-fff)",color:"var(--bl-primary-ink)"}}>{on?"✓":""}</span>
  const tabBooks=shelf(tab)

  return <Dialog open={open} onOpenChange={v=>{if(!v)onClose()}}>
    <DialogContent className="flex h-[min(90dvh,760px)] w-[calc(100vw-24px)] flex-col gap-3 overflow-hidden rounded-lg p-5 sm:max-w-[520px] sm:p-6" style={{background:"var(--bl-faf7f2)",color:"var(--bl-1a1208)"}}>
      <DialogHeader><DialogTitle className="font-serif text-2xl font-normal">Share</DialogTitle><DialogDescription className="sr-only">Choose what to share, untick any book, then copy the link or send it on WhatsApp.</DialogDescription></DialogHeader>
      {savedChoice&&<p className="rounded-lg px-3 py-2 text-[13px] leading-snug" style={{background:"var(--bl-f3ede3)"}}><b>Your saved choice:</b> {savedChoice.label}. Your existing link keeps working as it is.{savedChoice.showsOnHold&&" Your existing link also shows On Hold books."}</p>}
      <button type="button" aria-expanded={chooserOpen} onClick={()=>setChooserOpen(v=>!v)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left" style={{border:`1px solid ${chooserOpen?"var(--bl-c17f3e)":"var(--bl-e0d5c4)"}`,background:"var(--bl-fff)"}}>
        <span><span className="block text-[11px] tracking-wider" style={{color:"var(--bl-6b5c42)"}}>SHARE</span><span className="font-semibold">{chooserSummary(ordered,allFour)}</span></span><span aria-hidden="true">{chooserOpen?"⌃":"⌄"}</span>
      </button>
      {chooserOpen?<div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {SHARE_SOURCES.map(s=><label key={s.value} className="flex cursor-pointer items-center gap-3 border-b py-2.5" style={{borderColor:"var(--bl-efe7da, #efe7da)"}}><input type="checkbox" className="sr-only" checked={sources.includes(s.value)} onChange={()=>toggleSource(s.value)}/>{box(sources.includes(s.value))}<span><span className="block font-semibold">{s.label}</span><span className="block text-[13px]" style={{color:"var(--bl-6b5c42)"}}>{s.hint}</span></span></label>)}
          <label className="flex cursor-pointer items-center gap-3 border-b py-2.5" style={{borderColor:"var(--bl-efe7da, #efe7da)"}}><input type="checkbox" className="sr-only" checked={allFour} onChange={toggleFull}/>{box(allFour)}<span><span className="block font-semibold">Full library</span><span className="block text-[13px]" style={{color:"var(--bl-6b5c42)"}}>Reading, Queued, Completed and Recommendations</span></span></label>
        </div>
        <button type="button" disabled={sources.length===0} onClick={()=>setChooserOpen(false)} style={{...action,flex:"none",width:"100%",border:0,marginTop:12,background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)",opacity:sources.length?1:.6}}>Done</button>
      </div>:<>
        {ordered.length>1&&<div role="tablist" className="flex gap-4 overflow-x-auto border-b text-[14px]" style={{borderColor:"var(--bl-e0d5c4)",scrollbarWidth:"none"}}>
          {ordered.map(s=><button key={s} role="tab" type="button" aria-selected={s===tab} onClick={()=>setTab(s)} className="shrink-0 whitespace-nowrap pb-2" style={{border:0,background:"none",color:s===tab?"var(--bl-9a5c24, #9a5c24)":"var(--bl-6b5c42)",fontWeight:s===tab?600:400,borderBottom:s===tab?"2px solid var(--bl-c17f3e)":"2px solid transparent"}}>{sourceLabel(s)}</button>)}
        </div>}
        {tabBooks.length>0&&<div className="text-right text-[12.5px]"><button type="button" onClick={()=>setTabTicks(true)} className="underline-offset-2 hover:underline" style={{border:0,background:"none",color:"var(--bl-9a5c24, #9a5c24)"}}>Select all</button><span aria-hidden="true" style={{color:"var(--bl-9a5c24, #9a5c24)"}}> · </span><button type="button" onClick={()=>setTabTicks(false)} className="underline-offset-2 hover:underline" style={{border:0,background:"none",color:"var(--bl-9a5c24, #9a5c24)"}}>Clear</button></div>}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {tabBooks.length===0?<p className="py-6 text-center text-sm" style={{color:"var(--bl-8a7560)"}}>No books here yet.</p>:tabBooks.map(b=>{const on=!unticked.has(itemKey(tab,b)),cover=safeCover(b.cover?.replace(/^http:\/\//,"https://"));return <label key={b.id} className="flex cursor-pointer items-center gap-3 border-b py-2.5" style={{borderColor:"var(--bl-efe7da, #efe7da)"}}>
            <input type="checkbox" className="sr-only" checked={on} onChange={()=>toggleBook(b)}/>{box(on)}
            {cover?<img src={cover} alt="" className="h-[52px] w-9 shrink-0 rounded-sm object-cover"/>:<span aria-hidden="true" className="h-[52px] w-9 shrink-0 rounded-sm" style={{background:"var(--bl-f5ede0)",border:"1px solid var(--bl-e0d5c4)"}}/>}
            <span className="min-w-0"><span className="block font-semibold leading-snug">{b.title}</span><span className="block text-[13px]" style={{color:"var(--bl-6b5c42)"}}>{b.author}</span></span>
          </label>})}
        </div>
        <div className="border-t pt-3" style={{borderColor:"var(--bl-efe7da, #efe7da)"}}>
          {needsName?<DisplayNameField onSaved={n=>{setName(n);setNeedsName(false);setError("")}}/>:<>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider" style={{color:"var(--bl-6b5c42)"}}>What they will see</p>
            <div className="flex items-center gap-2 rounded-md p-1.5" style={{background:"#d9fdd3",color:"#1a1208"}}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded font-serif font-bold" style={{background:"#c17f3e",color:"#fff"}}>B</span>
              <span className="min-w-0 text-[12.5px] leading-snug"><span className="block truncate font-bold">{title||"Preparing..."}</span><span className="block truncate" style={{color:"#3d4a3b"}}>{name?shareSenderLine(name):""}</span></span>
            </div>
          </>}
          <p className="my-2 text-[11.5px] leading-snug" style={{color:"var(--bl-6b5c42)"}}>Your private notes, ratings and any book you untick are never shared.</p>
          {payload.length===0&&<p className="mb-2 text-sm" style={{color:"var(--bl-8a7560)"}}>Tick at least one book to share.</p>}
          {error&&!needsName&&<p role="alert" className="mb-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
          <div className="flex min-w-0 gap-2.5">
            <button type="button" disabled={!live} onClick={()=>void copy()} style={{...action,border:0,background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)",opacity:live?1:.6,cursor:live?"pointer":"default"}}>{copied?"✓ Link copied":live||error||needsName||payload.length===0?"Copy link":"Preparing..."}</button>
            {live
              ?<a href={`https://wa.me/?text=${encodeURIComponent(live.url)}`} target="_blank" rel="noopener noreferrer" onClick={()=>track("share.collection_whatsapp",{books:payload.length})} style={{...action,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-1a1208)"}}>WhatsApp</a>
              :<button type="button" disabled style={{...action,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-8a7560)",opacity:.6}}>WhatsApp</button>}
          </div>
        </div>
      </>}
    </DialogContent>
  </Dialog>
}
