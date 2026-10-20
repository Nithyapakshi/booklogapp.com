"use client"

import { useState } from "react"
import { useBooks, type BookStatus } from "@/lib/book-context"
import { searchBooks } from "@/lib/google-books-api"
import type { BookSearchResult } from "@/lib/google-books-api"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

const STARTERS = [
  { title: "Project Hail Mary", author: "Andy Weir" },
  { title: "Atomic Habits", author: "James Clear" },
  { title: "The Midnight Library", author: "Matt Haig" },
]

const addedLabels: Partial<Record<BookStatus, string>> = {
  reading: "Currently Reading",
  queued: "Want to Read",
  completed: "Completed",
}

const sans = { fontFamily: "'DM Sans', sans-serif" }

export function StarterBooksLine() {
  const { createBook } = useBooks()
  const { toast } = useToast()
  const [book, setBook] = useState<BookSearchResult | null>(null)
  const [resolving, setResolving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lineError, setLineError] = useState<string | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const openStarter = async (title: string, author: string) => {
    if (resolving) return
    setResolving(true)
    setLineError(null)
    try {
      const results = await searchBooks(`${title} ${author}`)
      const match = results.find((r) => r.title.trim().toLowerCase() === title.toLowerCase()) ?? results[0]
      if (match) {
        setDialogError(null)
        setBook(match)
      } else {
        setLineError("That book could not be found. Try searching above.")
      }
    } catch {
      setLineError("That book could not be loaded. Try searching above.")
    } finally {
      setResolving(false)
    }
  }

  const addTo = async (status: BookStatus) => {
    if (!book || saving) return
    setSaving(true)
    setDialogError(null)
    try {
      const result = await createBook(book, status)
      if (result.outcome === "duplicate") {
        toast({ title: "Already in your library", type: "warning" })
      } else {
        toast({ title: `Added to ${addedLabels[status] ?? "your shelf"}`, type: "success" })
      }
      setBook(null)
    } catch {
      setDialogError("The book was not saved. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const linkBtn = {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    font: "inherit",
    color: "var(--bl-c17f3e)",
    fontWeight: 600,
    borderBottom: "0.5px solid var(--bl-d4a96a)",
  } as const

  const addBtn = (primary: boolean) => ({
    flex: 1,
    minWidth: "110px",
    padding: "9px 0",
    background: primary ? "var(--bl-c17f3e)" : "transparent",
    color: primary ? "var(--bl-primary-ink)" : "var(--bl-1a1208)",
    border: primary ? "none" : "0.5px solid var(--bl-d4c5a9)",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: saving ? "not-allowed" : "pointer",
    ...sans,
  }) as const

  return (
    <>
      <p style={{ ...sans, fontSize: "13px", color: "var(--bl-8a7560)", margin: "2px 0 14px 2px" }}>
        Not sure where to start? Try{" "}
        {STARTERS.map((s, i) => (
          <span key={s.title}>
            <button type="button" onClick={() => openStarter(s.title, s.author)} disabled={resolving} style={linkBtn}>
              {s.title}
            </button>
            {i < STARTERS.length - 2 ? ", " : i === STARTERS.length - 2 ? " or " : "."}
          </span>
        ))}
      </p>
      {lineError && <p role="alert" className="text-sm text-red-600 dark:text-red-300" style={{ margin: "-8px 0 12px 2px" }}>{lineError}</p>}
      <Dialog open={!!book} onOpenChange={(open) => { if (!open) setBook(null) }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogTitle className="sr-only">{book?.title ?? "Starter book"}</DialogTitle>
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex-none w-[120px] max-sm:mx-auto">
              {book?.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.cover} alt={book.title} className="w-full h-auto rounded-md shadow-md" />
              ) : (
                <div className="w-full h-[180px] bg-muted rounded-md" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "18px", color: "var(--bl-1a1208)" }}>{book?.title}</h3>
              <p style={{ ...sans, fontSize: "13px", color: "var(--bl-8a7560)", marginTop: "4px" }}>{book?.author}</p>
              <p style={{ ...sans, fontSize: "12.5px", color: "var(--bl-6b5c42)", marginTop: "12px", lineHeight: 1.5 }}>Add it to a tab on your shelf:</p>
              <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                <button type="button" disabled={saving} onClick={() => addTo("reading")} style={addBtn(true)}>Add to Reading</button>
                <button type="button" disabled={saving} onClick={() => addTo("queued")} style={addBtn(false)}>Add to Queued</button>
                <button type="button" disabled={saving} onClick={() => addTo("completed")} style={addBtn(false)}>Add to Completed</button>
              </div>
              {dialogError && <p role="alert" className="text-sm text-red-600 dark:text-red-300" style={{ marginTop: "10px" }}>{dialogError}</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
