import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { ProfileTabs } from "@/components/profile-tabs"

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
const sans  = { fontFamily: "'DM Sans', sans-serif" }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Props = { params: Promise<{ username: string }> }

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // 1. Fetch profile by username
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, name, username, profile_visibility, share_mode, avatar_url")
    .eq("username", username)
    .single()

  const initial = profile?.name
    ? profile.name.charAt(0).toUpperCase()
    : username.charAt(0).toUpperCase()

  const displayName = profile?.name || username

  // 2. Private / not found state
  if (!profile || profile.profile_visibility !== "public") {
    return (
      <div style={{ minHeight: "100vh", background: "#faf7f2", ...sans }}>
        <Header />
        <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
          <p style={{ ...serif, fontSize: 20, color: "#6b5c42", marginBottom: 8 }}>
            This profile is private
          </p>
          <p style={{ fontSize: 14, color: "#a8927a" }}>
            This reader hasn't shared their library yet.
          </p>
        </div>
      </div>
    )
  }

  // 3. Fetch books
  const { data: allBooks } = await supabase
    .from("books")
    .select("id, title, author, cover_url, status, self_rating")
    .eq("user_id", profile.user_id)

  const books = allBooks || []

  const recommended = books.filter(b =>
    b.status?.toLowerCase() === "recommended"
  )
  const reading = books.filter(b => b.status === "reading")
  const queued = books.filter(b => b.status === "queued")

  const showFullLibrary = profile.share_mode === "full_library"

  // Build tabs — only tabs with books, recommendations always first
  type Tab = { key: string; label: string; books: typeof books }
  const allTabs: Tab[] = [
    { key: "recommended", label: "Recommendations", books: recommended },
    ...(showFullLibrary ? [
      { key: "reading", label: "Reading", books: reading },
      { key: "queued", label: "Queued", books: queued },
    ] : []),
  ].filter(t => t.books.length > 0)

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f2", ...sans }}>
      <Header />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 48px" }}>

        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", background: "#c17f3e",
            display: "flex", alignItems: "center", justifyContent: "center",
            ...serif, fontSize: 20, color: "#faf7f2", flexShrink: 0
          }}>
            {initial}
          </div>
          <div>
            <p style={{ ...serif, fontSize: 20, color: "#1a1208", margin: 0 }}>{displayName}</p>
            <p style={{ fontSize: 12, color: "#8a7560", margin: "2px 0 0" }}>@{username}</p>
          </div>
        </div>

        <ProfileTabs allTabs={allTabs} />

      </div>

      {/* Footer */}
      <div style={{ borderTop: "0.5px solid #e0d5c4", padding: "16px 24px", display: "flex", justifyContent: "space-between", maxWidth: 900, margin: "0 auto" }}>
        <span style={{ fontSize: 11, color: "#a8927a" }}>Shared via BookLog</span>
        <span style={{ ...serif, fontSize: 11, color: "#c17f3e" }}>booklogapp.com</span>
      </div>
    </div>
  )
}

function Header() {
  return (
    <div style={{ background: "#f3ede3", borderBottom: "0.5px solid #e0d5c4", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ width: 14, height: 3, background: "#c17f3e", borderRadius: 1, opacity: 1 }} />
          <div style={{ width: 14, height: 3, background: "#c17f3e", borderRadius: 1, opacity: 0.62 }} />
          <div style={{ width: 14, height: 3, background: "#c17f3e", borderRadius: 1, opacity: 0.32 }} />
        </div>
        <span style={{ ...serif, fontSize: 16, color: "#1a1208" }}>BookLog</span>
      </Link>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Link href="/login" style={{
          fontSize: 12, color: "#c17f3e", border: "0.5px solid #c17f3e",
          borderRadius: 4, padding: "5px 12px", textDecoration: "none", ...sans
        }}>
          Sign in
        </Link>
        <Link href="/signup" style={{
          fontSize: 12, color: "#faf7f2", background: "#c17f3e",
          borderRadius: 4, padding: "5px 12px", textDecoration: "none", ...sans
        }}>
          Sign up
        </Link>
      </div>
    </div>
  )
}
