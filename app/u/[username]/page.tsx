import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { notFound } from "next/navigation"
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
  const completed = books.filter(b => b.status === "completed")

  const showFullLibrary = profile.share_mode === "full_library"

  // Build tabs — only tabs with books, recommendations always first
  type Tab = { key: string; label: string; books: typeof books }
  const allTabs: Tab[] = [
    { key: "recommended", label: "Recommendations", books: recommended },
    ...(showFullLibrary ? [
      { key: "reading", label: "Reading", books: reading },
      { key: "completed", label: "Completed", books: completed },
    ] : []),
  ].filter(t => t.books.length > 0)

  const activeTab = allTabs[0]

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

function _unused({ allTabs }: { allTabs: { key: string; label: string; books: any[] }[] }) {
  if (allTabs.length === 0) {
    return (
      <p style={{ color: "#8a7560", fontSize: 14, marginTop: 32 }}>
        No books shared yet.
      </p>
    )
  }

  return (
    <div>
      {allTabs.map((tab, i) => (
        <section key={tab.key} style={{ marginBottom: i < allTabs.length - 1 ? 40 : 0 }}>
          {allTabs.length > 1 && (
            <div style={{ borderBottom: "1px solid #e0d5c4", marginBottom: 16 }}>
              <span style={{
                display: "inline-block",
                fontSize: 13, color: "#c17f3e",
                borderBottom: "2px solid #c17f3e",
                paddingBottom: 8, paddingRight: 4,
                ...sans2
              }}>
                {tab.label}
                <span style={{
                  marginLeft: 6, fontSize: 10,
                  background: "#fdf0e3", color: "#c17f3e",
                  borderRadius: 8, padding: "1px 6px"
                }}>
                  {tab.books.length}
                </span>
              </span>
            </div>
          )}
          {allTabs.length === 1 && (
            <p style={{ fontSize: 11, color: "#6b5c42", marginBottom: 12, ...sans2 }}>
              {tab.books.length} {tab.label.toLowerCase()}
            </p>
          )}
          <BookGrid books={tab.books} />
        </section>
      ))}
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
      {[1,2,3,4,5].map(s => (
        <div key={s} style={{
          width: 8, height: 8,
          background: s <= rating ? "#c17f3e" : "#e0d5c4",
          clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
        }} />
      ))}
    </div>
  )
}

function BookGrid({ books }: { books: any[] }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
      gap: 12
    }}>
      {books.map(book => (
        <div key={book.id} style={{
          background: "#fff",
          border: "0.5px solid #e0d5c4",
          borderRadius: 6,
          overflow: "hidden"
        }}>
          <div style={{ height: 90, background: "#e0d5c4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: 44, height: 64, background: "#c17f3e", borderRadius: 2, opacity: 0.4 }} />
            )}
          </div>
          <div style={{ padding: "8px 10px" }}>
            <p style={{
              fontSize: 11, color: "#1a1208", fontWeight: 500,
              margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              ...sans2
            }}>{book.title}</p>
            <p style={{
              fontSize: 10, color: "#8a7560", margin: "2px 0 0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              ...sans2
            }}>{book.author}</p>
            {book.self_rating > 0 && <StarRating rating={book.self_rating} />}
          </div>
        </div>
      ))}
    </div>
  )
}
