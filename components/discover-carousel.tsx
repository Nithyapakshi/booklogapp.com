"use client"
import React, { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }
const sans = { fontFamily: "'DM Sans', sans-serif" }

export interface CarouselBook { id: string; title: string; author: string; cover?: string; badge?: string }

function fallbackColor(title: string) {
  let h = 0
  for (let i = 0; i < title.length; i++) h = title.charCodeAt(i) + ((h << 5) - h)
  return `hsl(${Math.abs(h) % 360}, 45%, 62%)`
}

export function DiscoverCard({ book, onOpen, onDismiss, width }: { book: CarouselBook; onOpen: () => void; onDismiss: () => void; width: number }) {
  const [broken, setBroken] = useState(false)
  return (
    <div data-testid="discover-card" style={{ width, minWidth: width, scrollSnapAlign: "start", position: "relative", cursor: "pointer", ...sans }} onClick={onOpen}>
      <div style={{ width: "100%", aspectRatio: "2 / 3", borderRadius: 6, overflow: "hidden", background: "var(--bl-f3ede3)", boxShadow: "0 1px 4px rgba(26,18,8,0.14)", position: "relative" }}>
        {book.cover && !broken
          ? <img src={book.cover} alt={book.title} loading="lazy" onError={() => setBroken(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: fallbackColor(book.title), display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bl-primary-ink)", fontSize: 22, fontWeight: 600 }}>{(book.title.charAt(0) + (book.author.split(" ")[0] || "").charAt(0)).toUpperCase()}</div>}
        {book.badge && <span style={{ position: "absolute", left: 4, bottom: 4, fontSize: 9, fontWeight: 600, color: "var(--bl-8a5a1e)", background: "var(--bl-f5ede0)", border: "0.5px solid var(--bl-c17f3e)", borderRadius: 8, padding: "1px 6px" }}>{book.badge}</span>}
      </div>
      <button type="button" aria-label={`Not interested in ${book.title}`} title="Not interested" onClick={(e) => { e.stopPropagation(); onDismiss() }}
        style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, border: "none", background: "var(--bl-fff)", color: "var(--bl-5a4a38)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }}>
        <X size={12} />
      </button>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--bl-1a1208)", marginTop: 6, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{book.title}</div>
      <div style={{ fontSize: 11, color: "var(--bl-c17f3e)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.author}</div>
    </div>
  )
}

export function DiscoverRowView({ rowKey, title, subtitle, books, mobile, onOpen, onDismiss, actions }: {
  rowKey: string; title: string; subtitle?: string; books: CarouselBook[]; mobile: boolean
  onOpen: (b: CarouselBook) => void; onDismiss: (b: CarouselBook) => void; actions?: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [all, setAll] = useState(false)
  const width = mobile ? 104 : 128
  const scrollBy = (dir: number) => ref.current?.scrollBy({ left: dir * (width + 12) * 4, behavior: "smooth" })
  const link: React.CSSProperties = { fontSize: 11, color: "var(--bl-8a7560)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", ...sans }
  return (
    <section data-testid="discover-row" data-row-key={rowKey} style={{ marginTop: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ ...serif, fontSize: 15, fontWeight: "normal", color: "var(--bl-1a1208)", margin: 0 }}>{title}</h3>
          {subtitle && <div style={{ fontSize: 11, color: "var(--bl-8a7560)", marginTop: 2, ...sans }}>{subtitle}</div>}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexShrink: 0 }}>
          {actions}
          <button type="button" style={link} onClick={() => setAll(v => !v)}>{all ? "Show less" : "See all"}</button>
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <div ref={ref} style={all
          ? { display: "flex", flexWrap: "wrap", gap: 12 }
          : { display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x proximity", paddingBottom: 6, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          {books.map(b => <DiscoverCard key={b.id + b.title} book={b} width={width} onOpen={() => onOpen(b)} onDismiss={() => onDismiss(b)} />)}
        </div>
        {!all && !mobile && books.length > 6 && (<>
          <button type="button" aria-label="Scroll left" onClick={() => scrollBy(-1)} style={arrow("left")}><ChevronLeft size={16} /></button>
          <button type="button" aria-label="Scroll right" onClick={() => scrollBy(1)} style={arrow("right")}><ChevronRight size={16} /></button>
        </>)}
      </div>
    </section>
  )
}
const arrow = (side: "left" | "right"): React.CSSProperties => ({ position: "absolute", top: "calc(50% - 30px)", [side]: -8, width: 28, height: 28, borderRadius: 14, border: "0.5px solid var(--bl-d4c5a9)", background: "var(--bl-fff)", color: "var(--bl-5a4a38)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 5px rgba(0,0,0,0.15)" })

export function TopPickCard({ book, reason, onOpen, onDismiss }: { book: CarouselBook; reason: string; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div data-testid="top-pick" style={{ display: "flex", gap: 14, background: "var(--bl-fff)", border: "0.5px solid var(--bl-e0d5c4)", borderRadius: 10, padding: 12, marginTop: 14, ...sans }}>
      <div style={{ width: 84, minWidth: 84, aspectRatio: "2 / 3", borderRadius: 6, overflow: "hidden", background: "var(--bl-f3ede3)", boxShadow: "0 1px 4px rgba(26,18,8,0.14)" }}>
        {book.cover && <img src={book.cover} alt={book.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--bl-a8927a)" }}>Top pick</div>
        <div style={{ ...serif, fontSize: 16, color: "var(--bl-1a1208)", marginTop: 2 }}>{book.title}</div>
        <div style={{ fontSize: 12, color: "var(--bl-c17f3e)" }}>{book.author}</div>
        <div style={{ fontSize: 11, color: "var(--bl-6b5c42)", marginTop: 4, lineHeight: 1.4 }}>{reason}</div>
        <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8 }}>
          <button type="button" onClick={onOpen} style={{ padding: "6px 12px", background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "none", borderRadius: 14, fontSize: 11, fontWeight: 500, cursor: "pointer" }}>+ Add to library</button>
          <button type="button" onClick={onDismiss} style={{ padding: "6px 12px", background: "transparent", color: "var(--bl-8a7560)", border: "0.5px solid var(--bl-d4c5a9)", borderRadius: 14, fontSize: 11, cursor: "pointer" }}>Not interested</button>
        </div>
      </div>
    </div>
  )
}
