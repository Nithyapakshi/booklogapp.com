"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { submitFeedback } from "@/app/actions/feedback"
import { BookOpen, Heart, Sparkles, Settings, MessageSquare } from "lucide-react"

export default function FeedbackPage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState("")
  const [message, setMessage] = useState("")
  const [replyTo, setReplyTo] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const email = user?.email || ""

  useEffect(() => { if (email && !replyTo) setReplyTo(email) }, [email]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return
      const supabase = createClientSupabaseClient()
      const { data } = await supabase.from("profiles").select("name, username").eq("user_id", user.id).single()
      setDisplayName(data?.name || data?.username || email.split("@")[0] || "")
    }
    fetchProfile()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend() {
    setError("")
    if (!message.trim()) { setError("Please write a message."); return }
    setSending(true)
    try {
      const supabase = createClientSupabaseClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token || ""
      const res = await submitFeedback({ message, replyTo, accessToken: token })
      if (res.ok) { setSent(true); setMessage("") }
      else setError(res.error)
    } catch {
      setError("Could not send your feedback. Please try again.")
    }
    setSending(false)
  }

  const initial = displayName?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || "?"
  const firstName = displayName.split(" ")[0] || email.split("@")[0]
  const navStyle = { display: "flex", alignItems: "center", gap: "11px", padding: "10px 20px", color: "var(--bl-6b5c4e)", fontSize: "13px", fontWeight: "500", textDecoration: "none", borderLeft: "2.5px solid transparent" } as const

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bl-faf7f2)", fontFamily: "'DM Sans', sans-serif" }}>
      <aside className="hidden md:flex flex-col flex-shrink-0 w-[240px]" style={{ background: "var(--bl-faf7f2)", borderRight: "1px solid var(--bl-e8e0d5)", minHeight: "100vh" }}>
        <Link href="/books" className="flex items-center gap-3" style={{ padding: "22px 20px 18px", textDecoration: "none" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
            <rect x="3" y="17" width="22" height="5" rx="1.5" fill="var(--bl-c17f3e)" />
            <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="var(--bl-c17f3e)" opacity="0.62" />
            <rect x="3" y="4" width="12" height="5" rx="1.5" fill="var(--bl-c17f3e)" opacity="0.32" />
          </svg>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontWeight: "700", color: "var(--bl-2d2416)" }}>BookLog</span>
        </Link>
        <nav className="flex-1" style={{ paddingTop: "16px" }}>
          <div style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bl-b8a898)", padding: "0 20px 6px" }}>Library</div>
          <Link href="/books" style={navStyle}><BookOpen size={15} style={{ flexShrink: 0 }} /><span>My Books</span></Link>
          <Link href="/books?section=recommended" style={navStyle}><Heart size={15} style={{ flexShrink: 0 }} /><span>My Recommendations</span></Link>
          <div style={{ height: "1px", background: "var(--bl-ede6dc)", margin: "10px 0" }} />
          <div style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--bl-b8a898)", padding: "6px 20px" }}>Explore</div>
          <Link href="/books?section=discover" style={navStyle}><Sparkles size={15} style={{ flexShrink: 0 }} /><span>Discover</span></Link>
        </nav>
        <div style={{ borderTop: "1px solid var(--bl-ede6dc)" }}>
          <Link href="/settings" style={navStyle}><Settings size={15} style={{ flexShrink: 0 }} /><span>Settings</span></Link>
          <div style={{ ...navStyle, borderLeft: "2.5px solid var(--bl-c17f3e)", background: "var(--bl-selected)", color: "var(--bl-c17f3e)", fontWeight: "600" }}>
            <MessageSquare size={15} style={{ flexShrink: 0 }} /><span>Feedback</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 20px", borderTop: "1px solid var(--bl-ede6dc)" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "var(--bl-c17f3e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "var(--bl-primary-ink)" }}>{initial}</div>
          <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--bl-8a7060)" }}>{firstName}</span>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "24px 40px", maxWidth: "640px" }}>
        <div className="md:hidden" style={{ marginBottom: "16px" }}>
          <Link href="/books" style={{ fontSize: "13px", color: "var(--bl-c17f3e)", fontWeight: "600", textDecoration: "none" }}>&larr; My Books</Link>
        </div>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "24px", color: "var(--bl-1a1208)", fontWeight: "400", margin: "0 0 4px" }}>Feedback</p>
        <p style={{ fontSize: "13px", color: "var(--bl-8a7560)", margin: "0 0 20px" }}>Ideas, bugs, or a hello.</p>

        {sent ? (
          <div style={{ background: "var(--bl-fff)", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "10px", padding: "20px 24px" }}>
            <div style={{ fontSize: "14px", color: "var(--bl-1a1208)", fontWeight: "600", marginBottom: "4px" }}>Thank you, sent.</div>
            <div style={{ fontSize: "12px", color: "var(--bl-8a7560)", marginBottom: "12px" }}>If you left a reply-to email, I'll write back there.</div>
            <button onClick={() => setSent(false)} style={{ fontSize: "12px", color: "var(--bl-c17f3e)", fontWeight: "600", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Send another</button>
          </div>
        ) : (
          <div style={{ background: "var(--bl-fff)", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "10px", padding: "20px 24px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--bl-6b5c42)", fontWeight: "600", marginBottom: "4px" }}>Your message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={4000} rows={6} placeholder="Tell me what's on your mind..."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "6px", fontSize: "13px", color: "var(--bl-1a1208)", fontFamily: "'DM Sans', sans-serif", marginBottom: "14px", resize: "vertical" }} />
            <label style={{ display: "block", fontSize: "12px", color: "var(--bl-6b5c42)", fontWeight: "600", marginBottom: "4px" }}>Reply to</label>
            <input value={replyTo} onChange={e => setReplyTo(e.target.value)} type="email"
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: "6px", fontSize: "13px", color: "var(--bl-1a1208)", fontFamily: "'DM Sans', sans-serif", marginBottom: "4px" }} />
            <p style={{ fontSize: "11px", color: "var(--bl-a8927a)", margin: "0 0 16px" }}>I'll answer here. Change it if you prefer another email.</p>
            {error && <p role="alert" style={{ fontSize: "12px", color: "var(--bl-c0392b)", margin: "0 0 12px" }}>{error}</p>}
            <button onClick={handleSend} disabled={sending}
              style={{ padding: "9px 22px", background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "none", borderRadius: "6px", fontSize: "13px", fontWeight: "600", cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1 }}>
              {sending ? "Sending..." : "Send feedback"}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
