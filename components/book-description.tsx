"use client"
import { useEffect, useRef, useState } from "react"

// Shared with Add Book so text and expansion behaviour cannot drift.
// "Show more" appears whenever the 3-line clamp actually cuts the text off, measured on screen,
// so a short summary in a narrow column still gets it. Length is only the first guess before measuring.
export function BookDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false)
  const [clipped, setClipped] = useState(description.length > 200)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = textRef.current
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
  }, [description, expanded])

  return <div className="mb-4">
    <h3 className="font-medium mb-2">Description</h3>
    <p ref={textRef} className={`text-sm text-muted-foreground leading-relaxed${expanded ? "" : " line-clamp-3"}`}>{description}</p>
    {(clipped || expanded) && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="text-primary text-xs mt-1 hover:underline">{expanded ? "Show less" : "Show more"}</button>}
  </div>
}
