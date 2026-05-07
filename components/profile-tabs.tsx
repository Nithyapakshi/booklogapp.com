
"use client"
import React, { useState } from "react"

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
  const [pageSize, setPageSize] = useState<number | "all">(10)
  const [currentPages, setCurrentPages] = useState<Record<string, number>>(
    () => Object.fromEntries(allTabs.map(t => [t.key, 1]))
  )

  const currentPage = currentPages[activeKey] ?? 1

  const setCurrentPage = (page: number) => {
    setCurrentPages(prev => ({ ...prev, [activeKey]: page }))
  }

  const handleTabChange = (key: string) => {
    setActiveKey(key)
  }

  const handlePageSizeChange = (val: string) => {
    const next = val === "all" ? "all" : parseInt(val)
    setPageSize(next)
    setCurrentPages(Object.fromEntries(allTabs.map(t => [t.key, 1])))
  }

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
              onClick={() => handleTabChange(tab.key)}
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
      {(() => {
             const books = activeTab.books
             const paginatedBooks = pageSize === "all"
               ? books
               : books.slice((currentPage - 1) * (pageSize as number), currentPage * (pageSize as number))
             const totalPages = pageSize === "all" ? 1 : Math.ceil(books.length / (pageSize as number))
             const start = pageSize === "all" ? 1 : (currentPage - 1) * (pageSize as number) + 1
             const end   = pageSize === "all" ? books.length : Math.min(currentPage * (pageSize as number), books.length)
             const showPages = totalPages > 1

             const pageButtons = () => {
               if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
               if (currentPage <= 3) return [1, 2, 3, null, totalPages]
               if (currentPage >= totalPages - 2) return [1, null, totalPages - 2, totalPages - 1, totalPages]
               return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages]
             }

             const btnBase: React.CSSProperties = {
               width: "28px", height: "28px", borderRadius: "6px",
               border: "0.5px solid #e0d5c4", background: "transparent",
               display: "flex", alignItems: "center", justifyContent: "center",
               cursor: "pointer", fontSize: "11px", fontFamily: "'DM Sans', sans-serif",
               color: "#6b5c42",
             }
             const btnActive: React.CSSProperties = { ...btnBase, background: "#c17f3e", color: "#fff", border: "0.5px solid #c17f3e", fontWeight: 600 }
             const btnDisabled: React.CSSProperties = { ...btnBase, opacity: 0.35, cursor: "default" }

             const sizeSelector = (
               <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                 <span style={{ fontSize: "11px", color: "#8a7560", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" }}>Per page</span>
                 <select
                   value={pageSize === "all" ? "all" : String(pageSize)}
                   onChange={e => handlePageSizeChange(e.target.value)}
                   style={{
                     fontSize: "11px", fontFamily: "'DM Sans', sans-serif",
                     border: "0.5px solid #e0d5c4", borderRadius: "6px",
                     padding: "3px 20px 3px 7px", background: "#faf7f2",
                     color: "#1a1208", cursor: "pointer", appearance: "none",
                     backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238a7560'/%3E%3C/svg%3E\")",
                     backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center",
                   }}
                 >
                   <option value="10">10</option>
                   <option value="25">25</option>
                   <option value="50">50</option>
                   <option value="all">All</option>
                 </select>
               </div>
             )

             return (
               <>
                 <BookGrid books={paginatedBooks} />
                 {books.length > 0 && (
                   <div style={{ borderTop: "0.5px solid #e0d5c4", marginTop: "16px", paddingTop: "12px" }}>
                     <div className="md:hidden">
                       <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                         <span style={{ fontSize: "11px", color: "#8a7560", fontFamily: "'DM Sans', sans-serif" }}>{start}–{end} of {books.length}</span>
                         {sizeSelector}
                       </div>
                       {showPages && (
                         <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                           <button style={currentPage === 1 ? btnDisabled : btnBase} onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}>‹</button>
                           {pageButtons().map((p, i) =>
                             p === null
                               ? <span key={"e"+i} style={{ fontSize: "11px", color: "#8a7560", padding: "0 2px" }}>…</span>
                               : <button key={p} style={p === currentPage ? btnActive : btnBase} onClick={() => setCurrentPage(p)}>{p}</button>
                           )}
                           <button style={currentPage === totalPages ? btnDisabled : btnBase} onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}>›</button>
                         </div>
                       )}
                     </div>
                     <div className="hidden md:flex" style={{ alignItems: "center", gap: "8px" }}>
                       <span style={{ fontSize: "11px", color: "#8a7560", fontFamily: "'DM Sans', sans-serif", flex: 1 }}>Showing {start}–{end} of {books.length}</span>
                       {showPages && (
                         <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                           <button style={currentPage === 1 ? btnDisabled : btnBase} onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}>‹</button>
                           {pageButtons().map((p, i) =>
                             p === null
                               ? <span key={"e"+i} style={{ fontSize: "11px", color: "#8a7560", padding: "0 2px" }}>…</span>
                               : <button key={p} style={p === currentPage ? btnActive : btnBase} onClick={() => setCurrentPage(p)}>{p}</button>
                           )}
                           <button style={currentPage === totalPages ? btnDisabled : btnBase} onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}>›</button>
                         </div>
                       )}
                       {sizeSelector}
                     </div>
                   </div>
                 )}
               </>
             )
           })()}
    </div>
  )
}
