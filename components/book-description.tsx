"use client"
import { useCallback, useEffect, useState } from "react"

// Whether a 3-line clamped paragraph actually cuts its text off, measured on screen and re-measured on
// resize, so a short summary in a narrow column still gets "Show more". Length is only the first guess.
// Shared by BookDescription and the book view (book-details-dialog) so the rule cannot drift.
export function useClampedText(text: string, expanded: boolean) {
  // Callback ref: re-attaches whenever the paragraph is (re)mounted, e.g. after leaving edit mode.
  const [el, setEl] = useState<HTMLParagraphElement | null>(null)
  const ref = useCallback((node: HTMLParagraphElement | null) => setEl(node), [])
  const [clipped, setClipped] = useState(text.length > 200)

  useEffect(() => {
    if (!el || expanded) return
    const measure = () => {
      // Hidden (e.g. a dialog still opening) measures 0: keep the current answer until it is visible.
      if (el.clientHeight === 0) return
      setClipped(el.scrollHeight > el.clientHeight + 1)
    }
    measure()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure)
      return () => window.removeEventListener("resize", measure)
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el, text, expanded])

  return { ref, showToggle: clipped || expanded }
}

// Shared with Add Book so text and expansion behaviour cannot drift.
export function BookDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false)
  const { ref, showToggle } = useClampedText(description, expanded)

  return <div className="mb-4">
    <h3 className="font-medium mb-2">Description</h3>
    <p ref={ref} className={`text-sm text-muted-foreground leading-relaxed${expanded ? "" : " line-clamp-3"}`}>{description}</p>
    {showToggle && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="text-primary text-xs mt-1 hover:underline">{expanded ? "Show less" : "Show more"}</button>}
  </div>
}
