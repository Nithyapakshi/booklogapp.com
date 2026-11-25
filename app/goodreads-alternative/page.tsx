import type { Metadata } from "next"
import Link from "next/link"
import home from "../home/home.module.css"
import styles from "./page.module.css"
import { PUBLIC_ORIGIN } from "@/lib/public-discovery"

// Public landing page for readers moving from Goodreads (growth plan, Nov 2026).
// Static: no data, no sign-in. Visits are counted by signup source capture (lib/signup-source.ts):
// links to this page carry UTM tags, and the referring site is kept for untagged visits.
const TITLE = "BookLog | A Free Goodreads Alternative With Goodreads Import"
const DESCRIPTION = "Bring your Goodreads library to BookLog: shelves, ratings, read dates and reviews. A free, simpler reading log with reading stats and book picks."

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${PUBLIC_ORIGIN}/goodreads-alternative` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${PUBLIC_ORIGIN}/goodreads-alternative`, siteName: "BookLog", type: "website" },
}

const COVERS = ["starlight", "wildwood", "elsewhere", "slow-mornings", "tides", "paper-gardens", "pride-and-prejudice", "starlight"]

function BookLogLogo() {
  return <svg width="24" height="24" viewBox="0 0 28 28" aria-hidden="true">
    <rect x="3" y="17" width="22" height="5" rx="1.5" fill="var(--home-primary)" />
    <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="var(--home-primary)" opacity=".62" />
    <rect x="3" y="4" width="12" height="5" rx="1.5" fill="var(--home-primary)" opacity=".32" />
  </svg>
}

const Icon = ({ d }: { d: string[] }) => (
  <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--home-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d.map(p => <path key={p} d={p} />)}
  </svg>
)

const REASONS = [
  { icon: ["M12 3v12", "M7 10l5 5 5-5", "M5 21h14"], title: "Import your history", text: "Your shelves, ratings, read dates and reviews come with you. Reviews are saved as private notes. No retyping." },
  { icon: ["M4 4h16v16H4z", "M4 10h16", "M10 10v10"], title: "A simpler, cleaner library", text: "Clear shelves for what you are reading, what is next and what you finished. Ratings and notes on every book." },
  { icon: ["M4 20V10", "M10 20V4", "M16 20v-7", "M21 20H3"], title: "Book picks and reading stats", text: "Get your next book suggested from what you loved, and see your reading by month and year." },
]

const STEPS = [
  { title: "Export from Goodreads", text: "On the Goodreads website, go to My Books, then Import and export, then Export Library. You get a CSV file." },
  { title: "Upload it to BookLog", text: "Sign up with Google or email. In Settings, choose Import from Goodreads, pick the file, check the summary, then import." },
  { title: "Your shelves are ready", text: "Read books go to Completed, currently-reading to Reading, and want-to-read to Queued. Pick your next read." },
]

export default function GoodreadsAlternativePage() {
  return (
    <div className={home.home}>
      <header className={home.header}>
        <div className={home.headerInner}>
          <Link href="/home" className={`${home.brand} ${styles.brandLink}`}><BookLogLogo />BookLog</Link>
          <nav className={home.nav} aria-label="Account">
            <Link href="/login" className={home.login}>Log in</Link>
            <Link href="/signup" className={home.cta}>Get started</Link>
          </nav>
        </div>
      </header>
      <main className={home.main}>
        <section className={styles.hero} aria-labelledby="ga-title">
          <div className={styles.heroText}>
            <p className={home.eyebrow}>FOR GOODREADS READERS</p>
            <h1 id="ga-title" className={styles.title}>Bring your Goodreads library with you.</h1>
            <p className={styles.lead}>Upload your Goodreads export, check the summary, and your books land on your BookLog shelves. Then track what you read next, get book picks and see your reading stats.</p>
            <div className={styles.actions}>
              <Link href="/signup" className={home.cta}>Import from Goodreads</Link>
              <Link href="/login" className={styles.quiet}>Already on BookLog? Log in</Link>
            </div>
            <p className={styles.note}>Free. Takes a few minutes. You keep your Goodreads account.</p>
          </div>
          <div className={styles.shelf} aria-hidden="true">
            <div className={styles.pills}>
              <span className={`${styles.pill} ${styles.pillOn}`}>Completed</span>
              <span className={styles.pill}>Reading</span>
              <span className={styles.pill}>Queued</span>
            </div>
            <div className={styles.covers}>
              {COVERS.map((c, i) => <img key={i} src={`/home-covers/${c}.svg`} alt="" width="100" height="145" />)}
            </div>
            <div className={styles.imported}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--home-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
              <span>Imported from Goodreads</span>
            </div>
          </div>
        </section>

        <section className={styles.reasons} aria-label="Why readers switch">
          {REASONS.map(r => (
            <article key={r.title} className={styles.card}>
              <Icon d={r.icon} />
              <h2 className={styles.cardTitle}>{r.title}</h2>
              <p className={styles.cardText}>{r.text}</p>
            </article>
          ))}
        </section>

        <section className={styles.steps} aria-labelledby="ga-steps">
          <h2 id="ga-steps" className={styles.sectionTitle}>How to move in</h2>
          <ol className={styles.stepList}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.stepNum} aria-hidden="true">{i + 1}</span>
                <div><strong className={styles.stepTitle}>{s.title}</strong><p className={styles.stepText}>{s.text}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.closing}>
          <div>
            <h2 className={styles.closingTitle}>Pick up where Goodreads left off.</h2>
            <p className={styles.closingText}>Bring your past, track what is next.</p>
          </div>
          <Link href="/signup" className={home.cta}>Import from Goodreads</Link>
        </section>
      </main>
      <footer className={home.footer}>
        <span>© {new Date().getFullYear()} BookLog</span>
        <span><Link href="/home">Home</Link> · <Link href="/privacy">Privacy</Link></span>
      </footer>
    </div>
  )
}
