"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { useBooks } from "@/lib/book-context"
import { parseGoodreadsCsv, countByStatus, type ImportBook } from "@/lib/goodreads-import"
import { planImport, runImport, currentImport, subscribeImport, clearFinishedImport, stopImport, LIBRARY_ROW_LIMIT, type ImportPlan, type ImportState } from "@/lib/goodreads-import-run"
import { todayLocal } from "@/lib/reading-dates"

const LABELS: Record<ImportBook["status"], string> = { completed: "Completed", reading: "Reading", queued: "Queued", onHold: "On Hold" }
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

const secondaryButton = (busy: boolean) => ({ background: "var(--bl-fff)", color: "var(--bl-c17f3e)", border: "1px solid var(--bl-c17f3e)", borderRadius: "6px", padding: "8px 18px", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600, opacity: busy ? 0.7 : 1 } as const)
const textButton = { background: "none", border: "none", color: "var(--bl-c17f3e)", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, cursor: "pointer", padding: 0, marginLeft: "8px" } as const
const note = { fontSize: "12px", color: "var(--bl-6b5c42)", margin: "10px 0 0" } as const

export function GoodreadsImport() {
  const { user } = useAuth()
  const { books, loading, loadError, reloadBooks } = useBooks()
  const [run, setRun] = useState<ImportState | null>(currentImport())
  const [ready, setReady] = useState<{ plan: ImportPlan; counts: Record<ImportBook["status"], number> } | null>(null)
  const [error, setError] = useState("")
  const starting = useRef(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const running = run?.kind === "running"

  useEffect(() => subscribeImport(setRun), [])

  // Closing or reloading the tab mid-import stops it; what was saved stays, and re-running the file skips those books.
  useEffect(() => {
    if (!running) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [running])

  async function onFile(file: File | undefined) {
    setError("")
    setReady(null)
    if (!file) return
    if (loading || loadError) { setError("Your library hasn't loaded yet. Refresh the page and try again."); return }
    const parsed = parseGoodreadsCsv(await file.text(), todayLocal())
    if (fileInput.current) fileInput.current.value = ""
    if (!parsed.ok) { setError(parsed.error); return }
    const library = Object.values(books).flat()
    const plan = planImport(parsed.books, library)
    if (plan.toImport.length === 0) { setError("Every book in this file is already in your library. Nothing to import."); return }
    if (library.length + plan.toImport.length > LIBRARY_ROW_LIMIT) {
      setError(`This would take your library past ${LIBRARY_ROW_LIMIT} books, which BookLog can't show yet. Nothing was imported.`)
      return
    }
    setReady({ plan, counts: countByStatus(plan.toImport) })
  }

  async function start() {
    if (!ready || !user || starting.current) return
    starting.current = true
    const plan = ready.plan
    setReady(null)
    try { await runImport(plan, user.id, reloadBooks) } finally { starting.current = false }
  }

  function chooseFile() {
    clearFinishedImport()
    setReady(null)
    setError("")
    fileInput.current?.click()
  }

  const outcome = run?.kind === "finished" ? run.outcome : null

  return (
    <div>
      <div style={{ fontSize: "13px", color: "var(--bl-1a1208)", fontWeight: "600" }}>Import from Goodreads</div>
      <div style={{ fontSize: "12px", color: "var(--bl-8a7560)", margin: "2px 0 12px" }}>
        On the Goodreads website, go to My Books › Import and export › Export Library, then choose that file here. Ratings, read dates and reviews come too; reviews are saved as private notes.
      </div>
      <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={(e) => void onFile(e.target.files?.[0])} />

      {!running && !ready && (
        <button onClick={chooseFile} disabled={loading} style={secondaryButton(loading)}>Choose Goodreads file</button>
      )}

      {ready && !running && (
        <div>
          <p role="status" style={{ ...note, margin: "0 0 12px" }}>
            Ready to add {plural(ready.plan.toImport.length, "book")}:{" "}
            {(Object.keys(LABELS) as ImportBook["status"][]).filter(s => ready.counts[s]).map(s => `${ready.counts[s]} to ${LABELS[s]}`).join(", ")}.
            {ready.plan.alreadyInLibrary > 0 && ` ${plural(ready.plan.alreadyInLibrary, "book")} already in your library will be left as they are.`}
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => void start()} style={{ ...secondaryButton(false), background: "var(--bl-c17f3e)", color: "var(--bl-primary-ink)", border: "none" }}>
              Import {plural(ready.plan.toImport.length, "book")}
            </button>
            <button onClick={() => setReady(null)} style={{ ...secondaryButton(false), border: "none" }}>Cancel</button>
          </div>
        </div>
      )}

      {run?.kind === "running" && (
        <p role="status" style={{ ...note, margin: 0 }}>
          Importing… {run.done} of {run.total}. Keep this tab open.
          <button onClick={stopImport} style={textButton}>Stop</button>
        </p>
      )}

      {outcome && (
        <div role="status" style={note}>
          <p style={{ margin: 0 }}>
            {outcome.imported > 0 ? `Imported ${plural(outcome.imported, "book")}.` : "No new books were imported."}
            {outcome.alreadyInLibrary > 0 && ` ${plural(outcome.alreadyInLibrary, "book")} ${outcome.alreadyInLibrary === 1 ? "was" : "were"} already in your library.`}
            {outcome.stopped && " Stopped before the end; choose the same file again to add the rest."}
            {outcome.imported > 0 && <> <Link href="/books" style={{ color: "var(--bl-c17f3e)", fontWeight: 600 }}>See your books</Link></>}
          </p>
          {outcome.partial.length > 0 && (
            <p style={{ margin: "6px 0 0" }}>
              {plural(outcome.partial.length, "book")} came in without their read date or review: {outcome.partial.slice(0, 5).join(", ")}{outcome.partial.length > 5 ? "…" : ""}.
            </p>
          )}
          {outcome.failed.length > 0 && (
            <p style={{ margin: "6px 0 0" }}>
              {plural(outcome.failed.length, "book")} couldn't be saved: {outcome.failed.slice(0, 5).join(", ")}{outcome.failed.length > 5 ? "…" : ""}. Importing the same file again is safe; books already added are skipped.
            </p>
          )}
        </div>
      )}

      {error && <p role="alert" style={note}>{error}</p>}
    </div>
  )
}
