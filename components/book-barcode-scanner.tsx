"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Barcode } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { validBookISBN } from "@/lib/isbn"
import type { BookSearchResult } from "@/lib/google-books-api"
import { resolveScannedISBN } from "@/app/actions/scan-isbn"

export function BookBarcodeScanner({ onBook, onSearch }: { onBook: (book: BookSearchResult) => void; onSearch: () => void }) {
  const [open, setOpen] = useState(false)
  const [manual, setManual] = useState(false)
  const [isbn, setISBN] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [starting, setStarting] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const controls = useRef<{ stop: () => void } | null>(null)
  const working = useRef(false)
  const generation = useRef(0)

  const stop = () => {
    controls.current?.stop(); controls.current = null
    const stream = video.current?.srcObject as MediaStream | null
    stream?.getTracks().forEach(track => track.stop())
    if (video.current) video.current.srcObject = null
  }
  const close = () => { generation.current++; stop(); working.current = false; setBusy(false); setStarting(false); setOpen(false) }
  const openScanner = () => { generation.current++; working.current = false; setError(null); setISBN(""); setManual(false); setBusy(false); setOpen(true) }

  const resolve = async (input: string) => {
    if (working.current) return
    const valid = validBookISBN(input)
    if (!valid) { setError("Enter a valid 10- or 13-digit book ISBN."); return }
    working.current = true; stop(); setStarting(false); setBusy(true); setError(null); setISBN(valid); setManual(true)
    const ticket = generation.current
    try {
      const result = await resolveScannedISBN(valid)
      if (ticket !== generation.current) return
      if (result.ok) { close(); onBook(result.book) }
      else setError(result.error)
    } catch { if (ticket === generation.current) setError("Book lookup is unavailable. Try again later or add manually.") }
    finally { if (ticket === generation.current) { working.current = false; setBusy(false) } }
  }

  useEffect(() => {
    if (!open || manual) return
    let cancelled = false
    setStarting(true)
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable")
        const { BrowserMultiFormatReader } = await import("@zxing/browser")
        if (cancelled || !video.current) return
        const reader = new BrowserMultiFormatReader()
        const scan = await reader.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" } } }, video.current, (result, _error, scanControls) => {
          if (cancelled || working.current || !result) return
          const value = validBookISBN(result.getText())
          if (!value) { setError("That isn't a valid book ISBN. Scan the barcode on the back cover or enter the ISBN."); return }
          scanControls.stop()
          void resolve(value)
        })
        if (cancelled || working.current) { scan.stop(); return }
        controls.current = scan
        setStarting(false)
      } catch {
        if (!cancelled) { stop(); setStarting(false); setManual(true); setError("Camera unavailable. Enter the ISBN, search by title, or add manually.") }
      }
    }
    void start()
    const pause = () => { if (document.hidden) { cancelled = true; stop(); setStarting(false); setManual(true); setError("Camera paused. Enter the ISBN or scan again.") } }
    document.addEventListener("visibilitychange", pause)
    return () => { cancelled = true; stop(); document.removeEventListener("visibilitychange", pause) }
  }, [open, manual])

  useEffect(() => () => { generation.current++; stop() }, [])

  return <>
    <button type="button" onClick={openScanner} aria-label="Scan book barcode" title="Scan book barcode" className="md:hidden absolute right-0 top-0 bottom-0 w-11 border-l rounded-r-lg flex items-center justify-center" style={{ color: "#a66b2b", background: "#f7eee2", borderColor: "#e8dccd" }}><Barcode size={22} /></button>
    <Dialog open={open} onOpenChange={next => { if (!next) close() }}>
      <DialogContent className="max-w-[390px] max-h-[90dvh] overflow-y-auto max-md:top-auto max-md:bottom-0 max-md:translate-y-0 rounded-t-2xl sm:rounded-xl bg-white" aria-describedby="scan-description">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Georgia, serif", fontWeight: 400 }}>Scan a book</DialogTitle>
          <DialogDescription id="scan-description">Point your camera at the ISBN barcode on the back cover.</DialogDescription>
        </DialogHeader>
        {!manual && <div className="relative rounded-xl overflow-hidden bg-stone-800 h-64">
          <video ref={video} muted playsInline autoPlay className="w-full h-full object-cover" aria-label="Book barcode camera preview" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-[85%] h-28 border-2 border-amber-200 rounded-lg" /></div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white">{starting ? "Starting camera..." : "Keep the barcode inside the guide."}</p>
        </div>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {busy && <p role="status" className="text-sm text-stone-600">Looking up the latest available edition...</p>}
        {manual ? <form onSubmit={event => { event.preventDefault(); void resolve(isbn) }} className="space-y-3">
          <label htmlFor="scan-isbn" className="block text-sm">ISBN</label>
          <input id="scan-isbn" inputMode="text" autoComplete="off" value={isbn} disabled={busy} onChange={event => setISBN(event.target.value)} placeholder="10 or 13 digits" className="w-full border rounded-lg px-3 py-3" />
          <Button type="submit" disabled={busy} className="w-full" style={{ background: "#c17f3e", color: "white" }}>Find book</Button>
          <Button type="button" variant="outline" disabled={busy} className="w-full" onClick={() => { setError(null); setManual(false) }}>Scan again</Button>
        </form> : <Button type="button" variant="outline" onClick={() => { stop(); setManual(true); setError(null) }}>Enter ISBN instead</Button>}
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <button type="button" onClick={() => { close(); onSearch() }} style={{ color: "#a66b2b" }}>Search by title</button>
          <Link href="/books/add" onClick={close} style={{ color: "#a66b2b" }}>Add manually</Link>
          <button type="button" onClick={close} className="text-stone-600">Cancel</button>
        </div>
      </DialogContent>
    </Dialog>
  </>
}
