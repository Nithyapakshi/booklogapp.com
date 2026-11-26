"use client"
import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { parseCodedSave } from "@/lib/public-share-path"
import type { SharedSnapshot } from "@/lib/shared-book"
import { tokenFromShareCode } from "@/lib/public-share-path"
import { toCollection } from "@/lib/shared-collection"
import { bookKey, countBooks, decodeSelection, selectionStorageKey } from "@/lib/collection-share"

export function SharedBookContext({ nextPath }: { nextPath: string }) {
  const [book, setBook] = useState<SharedSnapshot | null>(null)
  const [waiting, setWaiting] = useState<{ name: string; covers: string[]; count: number } | null>(null)
  // Shared collection: keep the ticked books visible through sign-up and sign-in (board 7).
  useEffect(() => {
    setWaiting(null)
    const code = /^\/s\/books\/([A-Za-z0-9_-]{22})\?save=1$/.exec(nextPath)?.[1], token = code ? tokenFromShareCode(code) : null
    if (!token) return
    let cancelled = false
    let keys: string[] = []
    try { keys = decodeSelection(window.localStorage.getItem(selectionStorageKey(token))) } catch {}
    if (!keys.length) return
    void Promise.resolve(createClientSupabaseClient().rpc("read_collection_share", { p_token: token })).then(({ data, error }) => {
      const c = error ? null : toCollection(data)
      if (cancelled || !c) return
      const picked = new Map(c.items.filter(i => keys.includes(bookKey(i))).map(i => [bookKey(i), i]))
      if (picked.size) setWaiting({ name: c.display_name, covers: [...picked.values()].slice(0, 4).map(i => i.cover), count: picked.size })
    }).catch(() => { /* Context is optional; signup remains usable on RPC failure. */ })
    return () => { cancelled = true }
  }, [nextPath])
  useEffect(() => {
    setBook(null)
    const legacyToken = /^\/s\/([0-9a-f-]{36})\?save=1$/i.exec(nextPath)?.[1]
    const token=legacyToken || parseCodedSave(nextPath)?.token
    if (!token) return
    let cancelled = false
    void Promise.resolve(createClientSupabaseClient().rpc("read_book_share", { p_token: token })).then(({ data, error }) => {
      if (!cancelled && !error && data?.[0]) setBook(data[0])
    }).catch(() => { /* Context is optional; signup remains usable on RPC failure. */ })
    return () => { cancelled = true }
  }, [nextPath])
  if (waiting) return <div className="flex items-center gap-2 mb-5 p-3 rounded-lg" style={{background:"var(--bl-faf7f2)",border:"1px solid var(--bl-e0d5c4)"}}>
    {waiting.covers.map((c, i) => c.startsWith("https://") ? <img key={i} src={c} alt="" className="w-7 h-10 object-cover rounded-sm shrink-0"/> : <span key={i} aria-hidden="true" className="w-7 h-10 rounded-sm shrink-0" style={{background:"var(--bl-f5ede0)",border:"1px solid var(--bl-e0d5c4)"}}/>)}
    <p className="text-sm ml-1" style={{color:"var(--bl-1a1208)"}}>{countBooks(waiting.count)} from {waiting.name}, waiting</p>
  </div>
  if (!book) return null
  return <div className="flex items-center gap-3 mb-5 p-3 rounded-lg" style={{background:"var(--bl-faf7f2)",border:"1px solid var(--bl-e0d5c4)"}}>
    {book.cover?.startsWith("https://") && <img src={book.cover} alt="" className="w-10 h-14 object-contain shrink-0"/>}
    <div className="min-w-0"><p className="font-serif text-lg" style={{color:"var(--bl-1a1208)"}}>{book.title}</p><p className="text-xs" style={{color:"var(--bl-8a7560)"}}>{book.author}</p></div>
  </div>
}
