"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { useBooks } from "@/lib/book-context"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { sameBook } from "@/lib/book-identity"
import { catalogForShare } from "@/lib/shared-book"
import { toCollection, type SharedCollection, type SharedCollectionItem } from "@/lib/shared-collection"
import { bookKey, sourceLabel, sourceHeading, pageTitle, addButtonLabel, countBooks, keepBrowsingLabel, selectionStorageKey, encodeSelection, decodeSelection, type ShareSource } from "@/lib/collection-share"
import { track } from "@/lib/usage"

type Shelf = "reading" | "queued" | "completed" | "onHold" | "recommended"
const SHELVES: { value: Shelf; label: string }[] = [{value:"reading",label:"Reading"},{value:"queued",label:"Queued"},{value:"completed",label:"Completed"},{value:"onHold",label:"On Hold"},{value:"recommended",label:"Recommendations"}]
const shelfLabel = (v: Shelf) => SHELVES.find(s=>s.value===v)?.label || "Queued"
type Step = "browse" | "auth" | "review" | "done" | "allSaved"
type Outcome = { added: { item: SharedCollectionItem; id: string | null }[]; failed: SharedCollectionItem[]; already: SharedCollectionItem[] }
const BTN = { display:"flex", alignItems:"center", justifyContent:"center", width:"100%", height:48, borderRadius:10, fontSize:15, fontWeight:600, textDecoration:"none" } as const
const PRIMARY = { ...BTN, border:0, background:"var(--bl-c17f3e)", color:"var(--bl-primary-ink)" } as const
const SECONDARY = { ...BTN, border:"1px solid var(--bl-e0d5c4)", background:"var(--bl-fff)", color:"var(--bl-1a1208)" } as const
const DISABLED = { ...BTN, border:0, background:"var(--bl-f5ede0)", color:"var(--bl-6b5c42)" } as const

function Cover({ item, w=44, h=64 }: { item: { cover: string; title: string }; w?: number; h?: number }) {
  return item.cover ? <img src={item.cover} alt="" style={{width:w,height:h,objectFit:"cover",borderRadius:3,flexShrink:0}}/>
    : <span aria-hidden="true" style={{width:w,height:h,borderRadius:3,flexShrink:0,background:"var(--bl-f5ede0)",border:"1px solid var(--bl-e0d5c4)"}}/>
}
function Row({ item, children }: { item: SharedCollectionItem; children?: React.ReactNode }) {
  return <div style={{display:"flex",gap:12,alignItems:"center",padding:"11px 0",borderBottom:"1px solid var(--bl-efe7da, #efe7da)"}}>
    <Cover item={item}/><div style={{minWidth:0}}><div style={{fontWeight:600,lineHeight:1.3}}>{item.title}</div><div style={{fontSize:13,color:"var(--bl-6b5c42)",marginTop:2}}>{item.author}</div>{children}</div>
  </div>
}

// The recipient's view of a shared collection (boards 6, 7, 8). Browsing needs no login.
// Only the shared books are shown; nothing is saved until the reader confirms where.
export function SharedCollectionView({ token, code, initial }: { token: string; code: string; initial: SharedCollection }) {
  const [data,setData]=useState(initial),name=data.display_name
  const {user,isLoading}=useAuth(),{books,loading,loadError,createBook,reloadBooks}=useBooks()
  const tabs=data.sources.filter(s=>data.items.some(i=>i.source===s))
  const [tab,setTab]=useState<ShareSource>(tabs[0]||data.sources[0])
  const [selected,setSelected]=useState<Set<string>>(new Set())
  const [open,setOpen]=useState<Record<string,string|null|undefined>>({})
  const [step,setStep]=useState<Step>("browse"),[shelf,setShelf]=useState<Shelf>("queued"),[busy,setBusy]=useState(false)
  const [outcome,setOutcome]=useState<Outcome|null>(null),[message,setMessage]=useState("")
  const restored=useRef(false),lock=useRef(false)
  const path=`/s/books/${code}?save=1`
  const library=useMemo(()=>Object.values(books).flat(),[books])
  const libraryReady=!!user&&!loading&&!loadError
  const inLibrary=(i:{title:string;author:string})=>libraryReady&&library.some(b=>sameBook(b,{title:i.title,author:i.author}))
  // One entry per unique book across tabs (a book in two tabs counts once).
  const unique=useMemo(()=>{const m=new Map<string,SharedCollectionItem>();for(const i of data.items){const k=bookKey(i);if(!m.has(k))m.set(k,i)}return m},[data])
  const chosen=[...selected].filter(k=>unique.has(k)&&!inLibrary(unique.get(k)!))
  const canSelect=!user||libraryReady

  useEffect(()=>{track("share.collection_viewed",{tabs:data.sources.length})},[]) // eslint-disable-line react-hooks/exhaustive-deps
  // Keep the selection through sign-in, sign-up and the Google round trip (same browser).
  useEffect(()=>{ if(restored.current)return; restored.current=true
    try{const keys=decodeSelection(window.localStorage.getItem(selectionStorageKey(token)));if(keys.length)setSelected(new Set(keys))}catch{} },[token])
  useEffect(()=>{ if(!restored.current)return; try{selected.size?window.localStorage.setItem(selectionStorageKey(token),encodeSelection([...selected])):window.localStorage.removeItem(selectionStorageKey(token))}catch{} },[selected,token])
  // After signing in from the Add step: check the library, then go to "Choose where".
  const auto=useRef(false)
  useEffect(()=>{ if(auto.current||!user||isLoading||!libraryReady)return
    if(new URL(window.location.href).searchParams.get("save")!=="1")return
    auto.current=true;window.history.replaceState(null,"",`/s/books/${code}`)
    const keys=[...selected].filter(k=>unique.has(k))
    if(keys.length===0)return
    setStep(keys.every(k=>inLibrary(unique.get(k)!))?"allSaved":"review")
  },[user,isLoading,libraryReady,selected]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(i:SharedCollectionItem){ if(!canSelect||inLibrary(i))return; const k=bookKey(i); setSelected(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n}) }
  function tabTicks(on:boolean){ const keys=data.items.filter(i=>i.source===tab&&!inLibrary(i)).map(bookKey); setSelected(p=>{const n=new Set(p);for(const k of keys){on?n.add(k):n.delete(k)}return n}) }
  async function describe(i:SharedCollectionItem){ const k=`${i.source}\u0000${bookKey(i)}`
    if(open[k]!==undefined){setOpen(p=>{const n={...p};delete n[k];return n});return}
    setOpen(p=>({...p,[k]:null}))
    const c=await catalogForShare({title:i.title,author:i.author,cover:i.cover}).catch(()=>({description:"",cover:""}))
    setOpen(p=>k in p?{...p,[k]:c.description||""}:p) }
  function startAdd(){ if(chosen.length===0)return
    if(!user){setStep("auth");track("share.recipient_auth_prompt",{books:chosen.length});return}
    setStep("review");track("share.recipient_choose_opened",{books:chosen.length}) }

  async function save(only?: SharedCollectionItem[]) {
    if(lock.current||!user||!libraryReady)return
    lock.current=true;setBusy(true);setMessage("")
    try {
      // Re-read the share: books the sender removed since are left out.
      const {data:rows,error}=await createClientSupabaseClient().rpc("read_collection_share",{p_token:token})
      const fresh=error?null:toCollection(rows)
      if(!fresh){setMessage("These books could not be checked. Please try again.");return}
      setData(fresh)
      const freshKeys=new Set(fresh.items.map(bookKey))
      const targets=(only||chosen.map(k=>unique.get(k)!)).filter(i=>freshKeys.has(bookKey(i)))
      const result:Outcome={added:[],failed:[],already:[]}
      for(const item of targets){
        // Re-check the library before every save so nothing is ever duplicated.
        if(library.some(b=>sameBook(b,{title:item.title,author:item.author}))){result.already.push(item);continue}
        try{
          const r=await createBook({id:crypto.randomUUID(),title:item.title,author:item.author,cover:item.cover},shelf,{skipPrompts:true})
          if(r.outcome==="duplicate")result.already.push(item)
          else{result.added.push({item,id:r.books.find(b=>sameBook(b,item))?.id||null});track("book.added_from",{source:"shared_collection",shelf})}
        }catch{result.failed.push(item)}
      }
      const prev=only&&outcome?outcome:null
      const merged:Outcome=prev?{added:[...prev.added,...result.added],failed:result.failed,already:[...prev.already,...result.already]}:result
      setOutcome(merged)
      if(merged.failed.length===0)setSelected(new Set())
      setStep(merged.added.length===0&&merged.failed.length===0?"allSaved":"done")
    } catch { setMessage("The books were not saved. Please try again.") }
    finally { lock.current=false;setBusy(false) }
  }

  const libraryLink=outcome?.added.find(a=>a.id)?.id
  const header=<Link href="/" style={{color:"var(--bl-1a1208)",fontFamily:"Georgia,serif",fontSize:20,textDecoration:"none"}}>BookLog</Link>
  const shell=(body:React.ReactNode,footer?:React.ReactNode)=><main style={{minHeight:"100dvh",display:"flex",flexDirection:"column",background:"var(--bl-faf7f2)",color:"var(--bl-1a1208)",fontFamily:"DM Sans, sans-serif"}}>
    <div style={{flex:1,width:"100%",maxWidth:640,margin:"0 auto",padding:"24px 20px 16px"}}>{header}{body}</div>
    {footer&&<div style={{position:"sticky",bottom:0,background:"var(--bl-faf7f2)",borderTop:"1px solid var(--bl-e0d5c4)"}}><div style={{maxWidth:640,margin:"0 auto",padding:"12px 20px calc(16px + env(safe-area-inset-bottom))",display:"flex",flexDirection:"column",gap:10}}>{footer}</div></div>}
  </main>
  const h1=(t:string)=><h1 style={{fontFamily:"Georgia,serif",fontSize:28,fontWeight:400,lineHeight:1.2,margin:"20px 0 8px"}}>{t}</h1>

  if(step==="auth"){const list=chosen.map(k=>unique.get(k)!)
    return shell(<>{h1("Keep these books in your BookLog")}{list.map(i=><Row key={bookKey(i)} item={i}/>)}</>,<>
      <Link href={`/signup?next=${encodeURIComponent(path)}`} style={PRIMARY}>Create an account</Link>
      <Link href={`/login?next=${encodeURIComponent(path)}`} style={SECONDARY}>Sign in</Link>
      <button type="button" onClick={()=>setStep("browse")} style={{...SECONDARY,cursor:"pointer"}}>Back to shared books</button></>)}

  if(step==="review"){const list=[...selected].filter(k=>unique.has(k)).map(k=>unique.get(k)!),toAdd=list.filter(i=>!inLibrary(i)),saved=list.filter(i=>inLibrary(i))
    return shell(<>{h1(`Add ${countBooks(toAdd.length)}`)}
      <p style={{fontSize:14,color:"var(--bl-6b5c42)",margin:0}}>{saved.length?`${saved.length} of your ${list.length} books ${saved.length===1?"is":"are"} already in your library.`:`From ${data.sources.map(sourceLabel).join(" and ")}`}</p>
      {toAdd.map(i=><Row key={bookKey(i)} item={i}/>)}
      {saved.map(i=><div key={bookKey(i)} style={{opacity:.55}}><Row item={i}><span style={{display:"inline-block",fontSize:11,border:"1px solid var(--bl-e0d5c4)",borderRadius:6,padding:"2px 7px",marginTop:6}}>✓ Already in your library</span></Row></div>)}
      <label style={{display:"block",fontSize:14,fontWeight:600,color:"var(--bl-6b5c42)",marginTop:20}}>Add to
        <select value={shelf} onChange={e=>setShelf(e.target.value as Shelf)} style={{display:"block",width:"100%",height:48,marginTop:8,borderRadius:10,border:"1px solid var(--bl-e0d5c4)",background:"var(--bl-fff)",color:"var(--bl-1a1208)",padding:"0 12px",fontSize:15,fontWeight:400}}>{SHELVES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
      {message&&<p role="alert" style={{fontSize:14,color:"var(--bl-b3261e, #b3261e)",marginTop:12}}>{message}</p>}
    </>,<>
      <button type="button" disabled={busy||toAdd.length===0} onClick={()=>void save()} style={{...PRIMARY,cursor:"pointer",opacity:busy?.7:1}}>{busy?"Adding...":`Add ${countBooks(toAdd.length)} to ${shelfLabel(shelf)}`}</button>
      <button type="button" disabled={busy} onClick={()=>setStep("browse")} style={{...SECONDARY,cursor:"pointer"}}>Cancel</button></>)}

  if(step==="allSaved"){const list=[...selected].filter(k=>unique.has(k)).map(k=>unique.get(k)!)
    return shell(<>{h1(list.length===1?"This book is already in your library":list.length===2?"Both books are already in your library":"These books are already in your library")}
      {list.map(i=><Row key={bookKey(i)} item={i}><span style={{display:"inline-block",fontSize:11,border:"1px solid var(--bl-e0d5c4)",borderRadius:6,padding:"2px 7px",marginTop:6}}>✓ In your library</span></Row>)}
      <p style={{fontSize:14,color:"var(--bl-6b5c42)"}}>Nothing was added or moved.</p></>,<>
      <Link href="/books" style={PRIMARY}>View in my library</Link>
      <button type="button" onClick={()=>{setSelected(new Set());setStep("browse")}} style={{...SECONDARY,cursor:"pointer"}}>{keepBrowsingLabel(name,data.sources)}</button></>)}

  if(step==="done"&&outcome){const total=outcome.added.length+outcome.failed.length,partial=outcome.failed.length>0
    return shell(<>{h1(partial?`${outcome.added.length} of ${total} books added`:`✓ ${countBooks(outcome.added.length)} added`)}
      {outcome.added.length>0&&<p style={{fontSize:15,color:"var(--bl-6b5c42)",margin:0}}>Added to your {shelfLabel(shelf)}</p>}
      {outcome.added.map(a=><Row key={bookKey(a.item)} item={a.item}/>)}
      {partial&&<><p style={{fontSize:11,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--bl-6b5c42)",marginTop:20}}>Not added</p>{outcome.failed.map(i=><Row key={bookKey(i)} item={i}/>)}</>}
      {message&&<p role="alert" style={{fontSize:14,color:"var(--bl-b3261e, #b3261e)",marginTop:12}}>{message}</p>}
    </>,partial?<>
      <button type="button" disabled={busy} onClick={()=>void save(outcome.failed)} style={{...PRIMARY,cursor:"pointer",opacity:busy?.7:1}}>{busy?"Trying again...":`Try again for ${countBooks(outcome.failed.length)}`}</button>
      <Link href={libraryLink?`/books?show=${encodeURIComponent(libraryLink)}`:"/books"} style={SECONDARY}>View in my library</Link></>:<>
      <Link href={libraryLink?`/books?show=${encodeURIComponent(libraryLink)}`:"/books"} style={PRIMARY}>View in my library</Link>
      <button type="button" onClick={()=>{setOutcome(null);setStep("browse")}} style={{...SECONDARY,cursor:"pointer"}}>{keepBrowsingLabel(name,data.sources)}</button></>)}

  // Browse and select (board 6)
  const tabItems=data.items.filter(i=>i.source===tab)
  const checking=!!user&&loading
  return shell(<>
    {h1(pageTitle(name,data.sources))}
    {tabs.length>1&&<div role="tablist" style={{display:"flex",gap:22,overflowX:"auto",borderBottom:"1px solid var(--bl-e0d5c4)",marginTop:8,scrollbarWidth:"none"}}>
      {tabs.map(s=><button key={s} role="tab" type="button" aria-selected={s===tab} onClick={()=>setTab(s)} style={{flexShrink:0,whiteSpace:"nowrap",padding:"0 0 9px",border:0,background:"none",fontSize:14,cursor:"pointer",color:s===tab?"var(--bl-9a5c24, #9a5c24)":"var(--bl-6b5c42)",fontWeight:s===tab?600:400,borderBottom:s===tab?"2px solid var(--bl-c17f3e)":"2px solid transparent"}}>{sourceLabel(s)}</button>)}
    </div>}
    {tabs.length>1&&<h2 style={{fontFamily:"Georgia,serif",fontSize:22,fontWeight:400,margin:"18px 0 0"}}>{sourceHeading(name,tab)}</h2>}
    {!!user&&loadError&&<p role="alert" style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",background:"var(--bl-fbeee0, #fbeee0)",border:"1px solid var(--bl-efd2b0, #efd2b0)",borderRadius:10,padding:"10px 12px",fontSize:14,marginTop:14}}>We could not check your library.<button type="button" onClick={()=>reloadBooks()} style={{border:0,background:"none",color:"var(--bl-9a5c24, #9a5c24)",textDecoration:"underline",cursor:"pointer"}}>Try again</button></p>}
    {tabItems.length>0&&canSelect&&<div style={{textAlign:"right",fontSize:14,marginTop:12}}><button type="button" onClick={()=>tabTicks(true)} style={{border:0,background:"none",color:"var(--bl-9a5c24, #9a5c24)",cursor:"pointer"}}>Select all</button><span aria-hidden="true" style={{color:"var(--bl-9a5c24, #9a5c24)"}}> · </span><button type="button" onClick={()=>tabTicks(false)} style={{border:0,background:"none",color:"var(--bl-9a5c24, #9a5c24)",cursor:"pointer"}}>Clear</button></div>}
    {tabItems.length===0&&<p style={{fontSize:14,color:"var(--bl-8a7560)",marginTop:20}}>No books here now.</p>}
    {tabItems.map(i=>{const k=bookKey(i),dk=`${i.source}\u0000${k}`,saved=inLibrary(i),on=!saved&&selected.has(k),desc=open[dk]
      return <div key={dk} style={{borderBottom:"1px solid var(--bl-efe7da, #efe7da)"}}>
        <div style={{display:"flex",gap:12,alignItems:"center",padding:"12px 0"}}>
          <label style={{display:"flex",flexShrink:0,padding:6,margin:-6,cursor:saved||!canSelect?"default":"pointer"}}>
            <input type="checkbox" checked={on} disabled={saved||!canSelect} onChange={()=>toggle(i)} aria-label={saved?`${i.title} is already in your library`:`Select ${i.title}`} style={{width:22,height:22,accentColor:"var(--bl-c17f3e)"}}/>
          </label>
          <button type="button" aria-expanded={desc!==undefined} onClick={()=>void describe(i)} style={{display:"flex",gap:12,alignItems:"center",flex:1,minWidth:0,border:0,background:"none",padding:0,textAlign:"left",color:"inherit",cursor:"pointer"}}>
            <Cover item={i}/><span style={{minWidth:0,flex:1}}><span style={{display:"block",fontWeight:600,lineHeight:1.3}}>{i.title}</span><span style={{display:"block",fontSize:13,color:"var(--bl-6b5c42)",marginTop:2}}>{i.author}</span>
              {saved&&<span style={{display:"inline-block",fontSize:11,border:"1px solid var(--bl-e0d5c4)",borderRadius:6,padding:"2px 7px",marginTop:6,color:"var(--bl-6b5c42)"}}>✓ In your library</span>}</span>
            <span aria-hidden="true" style={{color:"var(--bl-8a7560)"}}>{desc!==undefined?"⌃":"⌄"}</span>
          </button>
        </div>
        {desc!==undefined&&<p style={{fontSize:14,lineHeight:1.5,color:"var(--bl-6b5c42)",margin:"0 0 12px 34px"}}>{desc===null?"Loading...":desc||"A summary is not available for this book right now."}</p>}
      </div>})}
  </>,<button type="button" disabled={chosen.length===0||checking||(!!user&&!!loadError)} onClick={startAdd} style={chosen.length===0||checking?{...DISABLED,cursor:"default"}:{...PRIMARY,cursor:"pointer"}}>{checking?"Checking your library...":addButtonLabel(chosen.length)}</button>)
}
