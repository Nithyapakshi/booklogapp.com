
"use client"
import { useState } from "react"

const sans = { fontFamily: "'DM Sans', sans-serif" }
const serif = { fontFamily: "Georgia, 'Times New Roman', serif" }

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
              ...sans
            }}>{book.title}</p>
            <p style={{
              fontSize: 10, color: "#8a7560", margin: "2px 0 0",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              ...sans
            }}>{book.author}</p>
            {book.self_rating > 0 && <StarRating rating={book.self_rating} />}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileTabs({ allTabs }: { allTabs: { key: string; label: string; books: any[] }[] }) {
  const [activeKey, setActiveKey] = useState(allTabs[0]?.key)

  if (allTabs.length === 0) {
    return (
      <p style={{ color: "#8a7560", fontSize: 14, marginTop: 32 }}>
        No books shared yet.
      </p>
    )
  }

  const activeTab = allTabs.find(t => t.key === activeKey) || allTabs[0]

  return (
    <div>
      {allTabs.length > 1 && (
        <div style={{ borderBottom: "1px solid #e0d5c4", marginBottom: 20, display: "flex", gap: 0 }}>
          {allTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveKey(tab.key)}
              style={{
                background: "none",
                border: "none",
                borderBottom: tab.key === activeKey ? "2px solid #c17f3e" : "2px solid transparent",
                color: tab.key === activeKey ? "#c17f3e" : "#8a7560",
                fontSize: 13,
                padding: "8px 16px 8px 0",
                marginRight: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                ...sans
              }}
            >
              {tab.label}
              <span style={{
                fontSize: 10,
                background: tab.key === activeKey ? "#fdf0e3" : "#f3ede3",
                color: tab.key === activeKey ? "#c17f3e" : "#8a7560",
                borderRadius: 8,
                padding: "1px 6px"
              }}>
                {tab.books.length}
              </span>
            </button>
          ))}
        </div>
      )}
      {allTabs.length === 1 && (
        <p style={{ fontSize: 11, color: "#6b5c42", marginBottom: 12, ...sans }}>
          {activeTab.books.length} {activeTab.label.toLowerCase()}
        </p>
      )}
      <BookGrid books={activeTab.books} />
    </div>
  )
}
