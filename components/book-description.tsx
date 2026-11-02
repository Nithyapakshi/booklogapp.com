"use client"
import { useState } from "react"

// Shared with Add Book so text and expansion behaviour cannot drift.
export function BookDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false)
  return <div className="mb-4">
    <h3 className="font-medium mb-2">Description</h3>
    <p className={`text-sm text-muted-foreground leading-relaxed${expanded ? "" : " line-clamp-3"}`}>{description}</p>
    {description.length > 200 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="text-primary text-xs mt-1 hover:underline">{expanded ? "Show less" : "Show more"}</button>}
  </div>
}
