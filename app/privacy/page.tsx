import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Privacy | BookLog", description: "How BookLog handles your account, library, recommendations and shared links." }
const sections = [
  [
    "About BookLog",
    "BookLog is a reading tracker. This notice explains how BookLog handles information when you use the website, sign in, manage your books, request recommendations or share a link. For privacy questions or requests, email pakshiraj.ananthan@gmail.com."
  ],
  [
    "Your account and library",
    "BookLog stores your email address, account identifier and sign-in information. You can also provide a name and username. Supabase handles authentication and stores BookLog's account and library data. If you use Google sign-in, Google shares basic account information with BookLog, such as your email address, name and profile picture. BookLog does not receive your Google password or access to your Gmail messages.",
    "Your library can include book titles, authors, covers, descriptions, genres, reading status, ratings, reading dates and personal notes. BookLog uses this information to display and manage your library and provide reading features. Feedback you submit is stored with your account identifier, display name, message and any reply address you provide. It may also be emailed to BookLog's operator through Resend."
  ],
  [
    "What other people can see",
    "Your personal notes are not included on shared profile pages or single-book links. If you enable profile sharing in Settings, your public profile can show your name, username, selected books, reading status and ratings. You can choose recommendations only or your full library, and turn profile sharing off in Settings.",
    "Creating a single-book link stores a separate snapshot of your Settings display name, the book's title, author and cover. Anyone with that link can view and forward it, even if your profile is private. These links do not expire and there is no Stop sharing control. Making your profile private, editing a book or removing it from your library does not revoke an existing single-book snapshot. Contact us if you want help with a shared link. BookLog cannot remove copies or screenshots someone else has already saved.",
    "Using the WhatsApp button opens WhatsApp with the link prepared. You choose the recipient and whether to send. WhatsApp handles activity in its service under its own privacy policy."
  ],
  [
    "Search, recommendations and external services",
    "Google Books and Open Library provide book searches, metadata and covers. Requests can include search text, an ISBN, a title, author or genre. Some requests and cover images load directly in your browser, so those services receive ordinary request information such as your IP address.",
    "When you use Ask AI, BookLog sends your request to Anthropic to generate book recommendations. It can also send titles already shown or dismissed so they are not repeated. Do not put sensitive personal information in a recommendation request. BookLog does not send your password or personal book notes as part of this recommendation request.",
    "BookLog uses ipapi.co to infer your country from your IP address and select a regional Amazon website. This happens when relevant library or public-profile pages load, not only when you click an Amazon link. Amazon links include affiliate tags. Following a link sends the book search to Amazon, which handles your visit and any purchase under its own policies.",
    "Vercel hosts the website. Supabase, Google, Open Library, Anthropic, Resend, ipapi.co, Amazon and WhatsApp handle the information needed for the features described above when you use them. Their own privacy policies describe their processing."
  ],
  [
    "Browser storage and technical records",
    "BookLog uses browser storage to keep you signed in and remember settings such as theme, page size, view mode, dismissed suggestions and cached recommendations. Authentication also uses session-related storage. Clearing browser storage can sign you out and reset these preferences.",
    "The website and its service providers process technical information needed to deliver and secure requests, such as IP address, browser information, request times and error records. BookLog's code also records some account and book identifiers in diagnostic logs. These records are separate from the book details shown on a shared page."
  ],
  [
    "Your choices and requests",
    "You can edit your profile and books, remove books and notes, change profile-sharing settings, and download your library as a CSV from Settings. Single-book links have the separate, persistent behaviour described above.",
    "For access, correction or deletion requests, contact pakshiraj.ananthan@gmail.com using the email address linked to your account where possible. We may need to verify that the request is yours. There is no self-service account-deletion button in BookLog. Deleting a book is not the same as deleting your account or a shared snapshot.",
    "Contact pakshiraj.ananthan@gmail.com to ask about retention of account data, feedback, backups and technical records, or to request deletion. Removing something from your library does not establish when it is removed from backups or technical records."
  ],
  [
    "Changes and contact",
    "This notice may be updated when BookLog's features or data handling change. The published page will show its update date. Questions or requests: pakshiraj.ananthan@gmail.com."
  ]
]

export default function PrivacyPage() {
  return <div style={{ minHeight: "100vh", background: "var(--bl-faf7f2)", color: "var(--bl-1a1208)", fontFamily: "'DM Sans', sans-serif" }}>
    <header style={{ borderBottom: "0.5px solid var(--bl-e0d5c4)", padding: "18px 24px" }}><nav aria-label="BookLog"><Link href="/home" style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "var(--bl-c17f3e)" }}>BookLog</Link></nav></header>
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "44px 24px 64px" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 34, lineHeight: 1.2 }}>Privacy notice</h1>
      <p style={{ fontSize: 13, color: "var(--bl-8a7560)", marginTop: 12, marginBottom: 38 }}>Last updated: 25 October 2026</p>
      {sections.map(([heading, ...paragraphs]) => <section key={heading} style={{ marginTop: 32 }} aria-label={heading}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 23, fontWeight: 400, lineHeight: 1.35, marginBottom: 14 }}>{heading}</h2>
        {paragraphs.map((text, index) => <p key={index} style={{ fontSize: 15, lineHeight: 1.85, marginBottom: 16, overflowWrap: "anywhere", color: "var(--bl-6b5c42)" }}>{text}</p>)}
      </section>)}
      <footer style={{ borderTop: "0.5px solid var(--bl-e0d5c4)", marginTop: 40, paddingTop: 20 }}><Link href="/home" style={{ color: "var(--bl-c17f3e)", fontSize: 14 }}>Back to BookLog</Link></footer>
    </main>
  </div>
}
