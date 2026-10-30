import type { Metadata } from "next"
import Link from "next/link"
import styles from "./home.module.css"
import HomeSections from "./home-sections"
import { PUBLIC_ORIGIN, HOME_DESCRIPTION, HOME_TITLE } from "@/lib/public-discovery"
import { HOME_FAQ, faqAnswerText } from "@/lib/home-faq"

export const metadata: Metadata = {
  title: HOME_TITLE,
  verification: { google: "Pq6XsHlZiwbh0PEeIzDIur1oFTsry4UgDtVKUKYjCUA" },
  description: HOME_DESCRIPTION,
  alternates: { canonical: `${PUBLIC_ORIGIN}/home` },
}

const application = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "BookLog",
  url: `${PUBLIC_ORIGIN}/home`,
  description: HOME_DESCRIPTION,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Reading log for books you want to read, are reading and have finished",
    "Ratings and private notes for each book",
    "Shareable recommendations shelf and profile link",
    "Book recommendations based on your library and reading mood",
    "CSV export of your library",
  ],
}

const faq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQ.map(item => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: faqAnswerText(item.answerParts) },
  })),
}

function BookLogLogo() {
  return <svg width="24" height="24" viewBox="0 0 28 28" aria-hidden="true">
    <rect x="3" y="17" width="22" height="5" rx="1.5" fill="var(--home-primary)" />
    <rect x="3" y="10.5" width="17" height="5" rx="1.5" fill="var(--home-primary)" opacity=".62" />
    <rect x="3" y="4" width="12" height="5" rx="1.5" fill="var(--home-primary)" opacity=".32" />
  </svg>
}

export default function HomePage() {
  return (
    <div className={styles.home}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(application).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq).replace(/</g, "\\u003c") }} />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}><BookLogLogo />BookLog</div>
          <nav className={styles.nav} aria-label="Account">
            <Link href="/login" className={styles.login}>Log in</Link>
            <Link href="/signup" className={styles.cta}>Get started</Link>
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="home-title">
          <div>
            <p className={styles.eyebrow}>YOUR READING LIFE, ORGANISED</p>
            <h1 id="home-title" className={styles.title}>Keep. Share.<br />Discover.</h1>
          </div>
          <div>
            <p className={styles.support}>A place for your reading list, your thoughts on every book, and ideas for what to read next.</p>
            <Link href="/signup" className={styles.cta}>Start your reading log for free</Link>
            <p className={styles.descriptor}>Book tracker · Reading log · Recommendations</p>
          </div>
        </section>
        <section className={styles.panels} aria-label="Your reading life with BookLog">
          <article className={`${styles.panel} ${styles.library}`}>
            <div className={styles.rule} aria-hidden="true" />
            <p className={styles.tag}>01 / YOUR LIBRARY</p>
            <h2 className={styles.panelTitle}>Remember more of what you read.</h2>
            <p className={styles.description}>Keep track of books you are reading, have finished or want to start. Save your ratings and notes alongside them.</p>
            <img className={`${styles.cover} ${styles.coverFirst}`} src="/home-covers/starlight.svg" width="100" height="145" alt="" />
            <img className={`${styles.cover} ${styles.coverSecond}`} src="/home-covers/wildwood.svg" width="100" height="145" alt="" />
          </article>
          <article className={`${styles.panel} ${styles.sharing}`}>
            <div className={styles.rule} aria-hidden="true" />
            <p className={styles.tag}>02 / MY RECOMMENDATIONS</p>
            <h2 className={styles.panelTitle}>A bookshelf worth sharing.</h2>
            <p className={styles.description}>Collect the books you recommend in one place and share your shelf with friends.</p>
            <img className={`${styles.cover} ${styles.coverFirst}`} src="/home-covers/elsewhere.svg" width="100" height="145" alt="" />
            <img className={`${styles.cover} ${styles.coverSecond}`} src="/home-covers/slow-mornings.svg" width="100" height="145" alt="" />
          </article>
          <article className={`${styles.panel} ${styles.discover}`}>
            <div className={styles.rule} aria-hidden="true" />
            <p className={styles.tag}>03 / DISCOVER</p>
            <h2 className={styles.panelTitle}>Find a book that fits your mood.</h2>
            <p className={styles.description}>Explore suggestions based on your reading, or describe what you fancy and ask AI for ideas.</p>
            <img className={`${styles.cover} ${styles.coverFirst}`} src="/home-covers/tides.svg" width="100" height="145" alt="" />
            <img className={`${styles.cover} ${styles.coverSecond}`} src="/home-covers/paper-gardens.svg" width="100" height="145" alt="" />
          </article>
        </section>
      </main>
      <HomeSections />
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} BookLog</span>
        <span><Link href="/privacy">Privacy</Link></span>
      </footer>
    </div>
  )
}
