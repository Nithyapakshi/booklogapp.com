"use client"
import { useEffect, useRef, useState } from "react"
import { useBooks, type BookStatus } from "@/lib/book-context"
import { useAmazonUrl } from "@/hooks/use-amazon-url"
import { BookDetailsDialog } from "@/components/book-details-dialog"
import type { Book } from "@/types"

const quiet = {color:"var(--bl-c17f3e)",textDecoration:"underline",textUnderlineOffset:3,minHeight:44}
export function NextReadHeader({choosing,hasChoice,disabled,onChoose,onCancel}:{choosing:boolean;hasChoice:boolean;disabled:boolean;onChoose:()=>void;onCancel:()=>void}) {
  return <div className="flex items-center justify-between gap-3 mt-5 border-t border-border pt-3">
    <h2 className="text-sm font-semibold text-muted-foreground">{choosing?"Choose next read":hasChoice?"Other queued books":"Queued books"}</h2>
    {choosing?<button type="button" style={quiet} onClick={onCancel}>Cancel</button>:!hasChoice&&<button type="button" style={quiet} disabled={disabled} onClick={onChoose}>Choose next read</button>}
  </div>
}
export function NextReadChoice({book,checked,onSelect}:{book:Book;checked:boolean;onSelect:()=>void}) {
  return <label className="flex gap-3 items-center rounded-lg bg-card p-3 cursor-pointer min-w-0">
    <input type="radio" name="next-read-book" value={book.id} checked={checked} onChange={onSelect} className="h-5 w-5 shrink-0 accent-[var(--bl-c17f3e)]"/>
    {book.cover&&<img src={book.cover} alt="" className="w-10 h-16 object-contain shrink-0"/>}
    <span className="min-w-0"><span className="block text-sm font-semibold break-words">{book.title}</span><span className="block text-xs text-muted-foreground mt-1 break-words">{book.author}</span>{book.genre&&<span className="block text-xs text-muted-foreground mt-2">{book.genre}</span>}</span>
  </label>
}
export function UpNext({book,busy,onStart,onChange}:{book:Book;busy:boolean;onStart:()=>void;onChange:()=>void}) {
  const [detailsOpen,setDetailsOpen] = useState(false)
  const [editing,setEditing] = useState(false)
  const [menuOpen,setMenuOpen] = useState(false)
  const [error,setError] = useState("")
  const [working,setWorking] = useState(false)
  const {moveBook,removeBook} = useBooks()
  const amazonUrl = useAmazonUrl(book.title,book.author)
  const act = async (status?:BookStatus) => {
    if(working||busy)return
    setWorking(true);setError("")
    try {if(status)await moveBook(book,status);else await removeBook(book.id,book.status as BookStatus,book.rowId);setMenuOpen(false)}
    catch {setError("Book was not changed. Please try again.")}
    finally {setWorking(false)}
  }
  return <><section aria-label="Up next" className="flex gap-3 items-start border-y border-border py-4 mt-5">
    {book.cover&&<button type="button" aria-label={`Open details for ${book.title}`} disabled={busy||working} onClick={()=>setDetailsOpen(true)}><img src={book.cover} alt="" style={{width:52,height:78,objectFit:"contain",flexShrink:0}}/></button>}
    <div className="min-w-0 flex-1"><h2 className="text-xs text-muted-foreground uppercase mb-1">Up next</h2><button type="button" disabled={busy||working} onClick={()=>setDetailsOpen(true)} className="text-sm font-semibold break-words text-left hover:underline">{book.title}</button>
      <div className="flex flex-wrap items-center gap-4 mt-2"><button type="button" disabled={busy||working} onClick={onStart} className="text-sm font-semibold rounded border border-border px-3 min-h-11" style={{color:"var(--bl-c17f3e)"}}>{busy?"Starting...":working?"Updating...":"Start reading"}</button><button type="button" disabled={busy||working} onClick={onChange} style={quiet}>Change</button></div>
    </div>
    <div className="relative"><button type="button" aria-label={`More actions for ${book.title}`} aria-expanded={menuOpen} disabled={busy||working} className="min-h-11 min-w-11 text-muted-foreground" onClick={()=>setMenuOpen(!menuOpen)}>•••</button>
      {menuOpen&&<div className="absolute right-0 top-11 z-30 w-48 bg-card border border-border rounded shadow-lg p-1 text-sm">
        <button className="block w-full text-left p-2" disabled={busy||working} onClick={()=>{setEditing(true);setDetailsOpen(true);setMenuOpen(false)}}>Edit details</button>
        {([['reading','Reading'],['completed','Completed'],['recommended','Recommendations'],['onHold','On Hold']] as const).map(([status,label])=><button key={status} disabled={busy||working} className="block w-full text-left p-2" onClick={()=>void act(status)}>Move to {label}</button>)}
        <a href={amazonUrl} target="_blank" rel="noopener noreferrer" className="block p-2">Find on Amazon</a>
        <button disabled={busy||working} className="block w-full text-left p-2 text-red-600 dark:text-red-300" onClick={()=>void act()}>Remove</button>
        <button className="block w-full text-left p-2" onClick={()=>setMenuOpen(false)}>Close</button>
      </div>}
    </div>
  </section>{error&&<p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}<BookDetailsDialog book={book} open={detailsOpen} onClose={()=>{setDetailsOpen(false);setEditing(false)}} mode="view" initialEdit={editing}/></>
}
export function NextReadConfirmation({selected,busy,onSave}:{selected:boolean;busy:boolean;onSave:()=>void}) {
  const anchor = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState(0)
  useEffect(() => {
    const main = anchor.current?.closest("main")
    const update = () => setLeft(window.innerWidth < 768 ? 0 : main?.getBoundingClientRect().left ?? 0)
    update()
    const observer = new ResizeObserver(update)
    if (main) observer.observe(main)
    window.addEventListener("resize",update)
    return () => {observer.disconnect();window.removeEventListener("resize",update)}
  },[])
  return <div ref={anchor} className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-5 py-3 flex items-center justify-between gap-3" style={{left,paddingBottom:"max(12px, env(safe-area-inset-bottom))"}}>
    <span className="text-xs text-muted-foreground" role="status">{selected?"1 book selected":"Choose one book"}</span>
    <button type="button" disabled={!selected||busy} onClick={onSave} className="rounded px-4 min-h-11 text-sm font-semibold disabled:opacity-40" style={{background:"var(--bl-c17f3e)",color:"var(--bl-primary-ink)"}}>{busy?"Saving...":"Set next read"}</button>
  </div>
}
