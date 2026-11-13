"use client"

import { useState } from "react"
import Link from "next/link"
import { unsubscribeFromEmails } from "@/app/actions/unsubscribe"

type State = "idle" | "working" | "done" | "invalid" | "failed"

const text = { fontSize: 15, lineHeight: 1.7, color: "var(--bl-6b5c42)", marginBottom: 24 } as const

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, setState] = useState<State>("idle")

  const unsubscribe = async () => {
    setState("working")
    setState(await unsubscribeFromEmails(token))
  }

  if (state === "done") return <>
    <p style={text}>You are unsubscribed. You will not get any more emails from BookLog. Your library is unchanged.</p>
    <Link href="/books" style={{ color: "var(--bl-c17f3e)", fontSize: 15 }}>Open BookLog</Link>
  </>

  if (state === "invalid") return <p style={text}>This unsubscribe link is not valid. Please email pakshiraj.ananthan@gmail.com and we will remove you.</p>

  return <>
    <p style={text}>You will stop getting emails from BookLog. Your library and account are not affected.</p>
    <button type="button" onClick={unsubscribe} disabled={state === "working"}
      style={{ background: "var(--bl-c17f3e)", color: "#fff", border: "none", borderRadius: 8, padding: "11px 22px", fontSize: 15, fontFamily: "'DM Sans', sans-serif", cursor: state === "working" ? "default" : "pointer", opacity: state === "working" ? 0.7 : 1 }}>
      {state === "working" ? "Unsubscribing…" : "Unsubscribe"}
    </button>
    {state === "failed" && <p role="alert" style={{ ...text, marginTop: 16, marginBottom: 0 }}>Could not unsubscribe. Please try again.</p>}
  </>
}
