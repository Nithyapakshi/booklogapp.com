"use client"
import { useEffect, useState } from "react"

export function ShareControls({ getUrl, label }: { getUrl: () => Promise<string>; label: string }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("")
  useEffect(()=>{if(message!=="Copied!")return;const timer=setTimeout(()=>setMessage(""),2000);return()=>clearTimeout(timer)},[message])
  async function share(whatsapp: boolean) {
    if (busy) return
    // Open synchronously from the user's gesture, before an async link creation.
    const tab = whatsapp ? window.open("about:blank", "_blank") : null
    if (tab) tab.opener = null
    setBusy(true); setMessage("")
    try {
      const url = await getUrl()
      if (whatsapp) {
        if (!tab) throw new Error("Allow pop-ups to open WhatsApp, or use Copy link.")
        tab.location.href = `https://wa.me/?text=${encodeURIComponent(url)}`
      } else { await navigator.clipboard.writeText(url); setMessage("Copied!") }
    } catch (e) { tab?.close(); setMessage(e instanceof Error ? e.message : "Could not share. Please try again.") }
    finally { setBusy(false) }
  }
  return <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8,color:"var(--bl-8a7560)",fontSize:12}}>
    <button type="button" aria-label={`Share ${label} on WhatsApp`} disabled={busy} onClick={()=>share(true)} style={{background:"none",border:0,color:"inherit",minWidth:44,minHeight:44,cursor:"pointer"}}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 7.5c.3 4.5 3.3 7.4 7.5 8l1.2-2-2.8-1.3-1 1c-1.8-.8-2.8-1.8-3.5-3.5l.8-1L9.2 6.5Z"/></svg>
    </button>
    <button type="button" aria-label={`Copy ${label} link`} disabled={busy} onClick={()=>share(false)} style={{background:"none",border:0,color:"inherit",minHeight:44,cursor:"pointer",fontSize:12}}>{busy?"Preparing...":message==="Copied!"?"Copied!":"Copy link"}</button>
    {message && message!=="Copied!" && <span role="alert">{message}</span>}
  </div>
}
