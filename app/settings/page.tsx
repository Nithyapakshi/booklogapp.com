"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import Link from "next/link"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { BookOpen, Heart, Sparkles, Settings } from "lucide-react"

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername]       = useState("")
  const [sharingOn, setSharingOn]     = useState(false)
  const [shareMode, setShareMode]     = useState<"recommendations" | "full_library">("recommendations")
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [usernameError, setUsernameError] = useState("")
  const [copied, setCopied]           = useState(false)
  const email = user?.email || ""

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return
      const supabase = createClientSupabaseClient()
      const { data } = await supabase
        .from("profiles")
        .select("name, username, profile_visibility, share_mode")
        .eq("user_id", user.id)
        .single()
      if (data) {
        if (data.name) setDisplayName(data.name)
        else {
          const first = user.user_metadata?.first_name || ""
          const last  = user.user_metadata?.last_name  || ""
          setDisplayName([first, last].filter(Boolean).join(" "))
        }
        setUsername(data.username || "")
        setSharingOn(data.profile_visibility === "public")
        setShareMode(data.share_mode === "full_library" ? "full_library" : "recommendations")
      }
    }
    fetchProfile()
  }, [user])

  async function handleSave() {
    if (!user) return
    if (username && !/^[a-z0-9_-]{3,30}$/.test(username)) {
      setUsernameError("3–30 chars: lowercase letters, numbers, - or _ only")
      return
    }
    setUsernameError("")
    setSaving(true)
    const supabase = createClientSupabaseClient()
    await supabase.from("profiles").upsert({
      user_id:            user.id,
      email:              email,
      name:               displayName,
      username:           username,
      profile_visibility: sharingOn ? "public" : "private",
      share_mode:         shareMode,
    }, { onConflict: "user_id" })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(`https://booklogapp.com/u/${username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const initial = displayName?.charAt(0)?.toUpperCase() || email?.charAt(0)?.toUpperCase() || "?"
  const firstName = displayName.split(" ")[0] || email.split("@")[0]

  return (
    <div className="flex min-h-screen" style={{ background: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}>

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col flex-shrink-0 w-[240px]"
        style={{ background: "#faf7f2", borderRight: "1px solid #e8e0d5", minHeight: "100vh" }}>

        <Link href="/books" className="flex items-center gap-3" style={{ padding: "22px 20px 18px", textDecoration: "none" }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
            <rect x="3" y="17" width="22" height="5" rx="1.5" fill="#c17f3e" />
            <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="#c17f3e" opacity="0.62" />
            <rect x="3" y="4" width="12" height="5" rx="1.5" fill="#c17f3e" opacity="0.32" />
          </svg>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontWeight: "700", color: "#2d2416" }}>BookLog</span>
        </Link>

        <nav className="flex-1" style={{ paddingTop: "16px" }}>
          <div style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "#b8a898", padding: "0 20px 6px" }}>Library</div>
          {[
            { href: "/books", label: "My Books",           icon: BookOpen },
            { href: "/books", label: "My Recommendations", icon: Heart    },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={label} href={href} style={{ display: "flex", alignItems: "center", gap: "11px", padding: "10px 20px", color: "#6b5c4e", fontSize: "13px", fontWeight: "500", textDecoration: "none", borderLeft: "2.5px solid transparent" }}>
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span>{label}</span>
            </Link>
          ))}
          <div style={{ height: "1px", background: "#ede6dc", margin: "10px 0" }} />
          <div style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", color: "#b8a898", padding: "6px 20px" }}>Explore</div>
          <Link href="/books" style={{ display: "flex", alignItems: "center", gap: "11px", padding: "10px 20px", color: "#6b5c4e", fontSize: "13px", fontWeight: "500", textDecoration: "none", borderLeft: "2.5px solid transparent" }}>
            <Sparkles size={15} style={{ flexShrink: 0 }} />
            <span>Discover</span>
          </Link>
        </nav>

        {/* Settings — active */}
        <div style={{ borderTop: "1px solid #ede6dc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "11px", padding: "10px 20px", borderLeft: "2.5px solid #c17f3e", background: "rgba(193,127,62,0.08)", color: "#c17f3e", fontSize: "13px", fontWeight: "600" }}>
            <Settings size={15} style={{ flexShrink: 0 }} />
            <span>Settings</span>
          </div>
        </div>

        {/* User avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 20px", borderTop: "1px solid #ede6dc" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#c17f3e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "white", flexShrink: 0 }}>
            {initial}
          </div>
          <span style={{ fontSize: "13px", fontWeight: "500", color: "#8a7060" }}>{firstName}</span>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: "24px 40px", maxWidth: "640px" }}>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "24px", color: "#1a1208", fontWeight: "400", margin: "0 0 4px" }}>Settings</p>
        <p style={{ fontSize: "13px", color: "#8a7560", margin: "0 0 20px" }}>Manage your profile and sharing preferences</p>

        {/* Profile section */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8927a", fontWeight: "600", marginBottom: "8px" }}>Profile</div>
          <div style={{ background: "#fff", border: "0.5px solid #e0d5c4", borderRadius: "10px", padding: "14px 20px" }}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#6b5c42", fontWeight: "600", marginBottom: "4px" }}>Display name</label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "0.5px solid #e0d5c4", borderRadius: "6px", fontSize: "13px", color: "#1a1208", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#6b5c42", fontWeight: "600", marginBottom: "4px" }}>Username</label>
              <input
                value={username}
                onChange={e => { setUsername(e.target.value.toLowerCase()); setUsernameError("") }}
                placeholder="e.g. pakshiraj"
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: `0.5px solid ${usernameError ? "#c0392b" : "#e0d5c4"}`, borderRadius: "6px", fontSize: "13px", color: "#1a1208", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}
              />
              {usernameError
                ? <p style={{ fontSize: "11px", color: "#c0392b", marginTop: "4px" }}>{usernameError}</p>
                : <p style={{ fontSize: "11px", color: "#a8927a", marginTop: "4px" }}>booklogapp.com/u/{username || "yourname"} — your shareable link</p>}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#6b5c42", fontWeight: "600", marginBottom: "5px" }}>Email</label>
              <input
                value={email}
                readOnly
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "0.5px solid #e0d5c4", borderRadius: "6px", fontSize: "13px", color: "#a8927a", background: "#f3ede3", fontFamily: "'DM Sans', sans-serif", cursor: "not-allowed" }}
              />
            </div>
          </div>
        </div>

        {/* Sharing section */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#a8927a", fontWeight: "600", marginBottom: "8px" }}>Sharing</div>
          <div style={{ background: "#fff", border: "0.5px solid #e0d5c4", borderRadius: "10px", padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "16px", borderBottom: "0.5px solid #f0e8da" }}>
              <div>
                <div style={{ fontSize: "13px", color: "#1a1208", fontWeight: "600" }}>Allow sharing</div>
                <div style={{ fontSize: "12px", color: "#8a7560", marginTop: "2px" }}>Anyone with your link can view your books</div>
              </div>
              <button
                onClick={() => setSharingOn(!sharingOn)}
                style={{ width: "36px", height: "20px", borderRadius: "10px", background: sharingOn ? "#c17f3e" : "#e0d5c4", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}
              >
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", left: sharingOn ? "18px" : "2px", transition: "left 0.2s" }} />
              </button>
            </div>
            <div style={{ marginTop: "12px" }}>
              <div style={{ fontSize: "12px", color: "#6b5c42", fontWeight: "600", marginBottom: "8px" }}>What to share</div>
              {[
                { value: "recommendations", label: "My recommendations only", desc: "Visitors see only books you've marked as recommendations" },
                { value: "full_library",    label: "Full library",            desc: "Visitors see all your books across every status" },
              ].map(opt => (
                <div
                  key={opt.value}
                  onClick={() => setShareMode(opt.value as "recommendations" | "full_library")}
                  style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "8px", cursor: "pointer" }}
                >
                  <div style={{ width: "15px", height: "15px", borderRadius: "50%", border: "1.5px solid #c17f3e", marginTop: "2px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: shareMode === opt.value ? "#c17f3e" : "transparent" }}>
                    {shareMode === opt.value && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#1a1208", fontWeight: "600" }}>{opt.label}</div>
                    <div style={{ fontSize: "11px", color: "#8a7560", marginTop: "1px" }}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            {username && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", background: "#f3ede3", border: "0.5px solid #e0d5c4", borderRadius: "6px", padding: "8px 12px" }}>
                <span style={{ fontSize: "12px", color: "#6b5c42", flex: 1 }}>booklogapp.com/u/{username}</span>
                <button
                  onClick={copyLink}
                  style={{ fontSize: "11px", color: "#c17f3e", fontWeight: "600", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{ background: "#c17f3e", color: "#fff", border: "none", borderRadius: "6px", padding: "10px 28px", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: saving ? "not-allowed" : "pointer", fontWeight: "600", opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>

        {/* Sign out — mobile only */}
        <div className="md:hidden" style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid #e0d5c4" }}>
          <button
            onClick={() => signOut()}
            style={{ fontSize: "13px", color: "#b85c5c", background: "none", border: "0.5px solid #e0c8c8", borderRadius: "6px", padding: "10px 24px", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
        <button
          onClick={async () => { const supabase = createClientSupabaseClient(); await supabase.auth.resetPasswordForEmail(email, { redirectTo: "https://booklogapp.com/settings" }); alert("Password reset email sent!") }}
          style={{ display: "block", marginTop: "12px", fontSize: "12px", color: "#c17f3e", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", padding: 0 }}
        >
          Change password
        </button>
      </main>
    </div>
  )
}
