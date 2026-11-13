import Link from "next/link"
import type { Metadata } from "next"
import { UnsubscribeButton } from "@/components/unsubscribe-button"
import { isUnsubscribeToken } from "@/lib/email-unsubscribe"

export const metadata: Metadata = { title: "Unsubscribe | BookLog", robots: { index: false, follow: false } }

type Props = { searchParams: Promise<{ t?: string }> }

// Opening this page changes nothing. Only the button unsubscribes, so link scanners in mail apps
// that open every URL can never unsubscribe a reader by accident.
export default async function UnsubscribePage({ searchParams }: Props) {
  const { t } = await searchParams
  const token = isUnsubscribeToken(t) ? t : ""
  return <div style={{ minHeight: "100vh", background: "var(--bl-faf7f2)", color: "var(--bl-1a1208)", fontFamily: "'DM Sans', sans-serif" }}>
    <header style={{ borderBottom: "0.5px solid var(--bl-e0d5c4)", padding: "18px 24px" }}><nav aria-label="BookLog"><Link href="/home" style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "var(--bl-c17f3e)" }}>BookLog</Link></nav></header>
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "56px 24px 64px" }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 30, lineHeight: 1.25, marginBottom: 16 }}>Unsubscribe from BookLog emails</h1>
      {token
        ? <UnsubscribeButton token={token} />
        : <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--bl-6b5c42)" }}>This unsubscribe link is not complete. Please use the link in your email, or email pakshiraj.ananthan@gmail.com and we will remove you.</p>}
    </main>
  </div>
}
