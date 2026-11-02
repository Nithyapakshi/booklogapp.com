"use client"
import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { parseCodedSave } from "@/lib/public-share-path"
import type { SharedSnapshot } from "@/lib/shared-book"

export function SharedBookContext({ nextPath }: { nextPath: string }) {
  const [book, setBook] = useState<SharedSnapshot | null>(null)
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
  if (!book) return null
  return <div className="flex items-center gap-3 mb-5 p-3 rounded-lg" style={{background:"var(--bl-faf7f2)",border:"1px solid var(--bl-e0d5c4)"}}>
    {book.cover?.startsWith("https://") && <img src={book.cover} alt="" className="w-10 h-14 object-contain shrink-0"/>}
    <div className="min-w-0"><p className="font-serif text-lg" style={{color:"var(--bl-1a1208)"}}>{book.title}</p><p className="text-xs" style={{color:"var(--bl-8a7560)"}}>{book.author}</p></div>
  </div>
}
