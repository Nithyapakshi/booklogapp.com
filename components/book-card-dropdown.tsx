"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { BookStatus } from "@/lib/book-context"
import type { Book } from "@/types"

interface BookCardDropdownProps {
  book: Book
  isOpen: boolean
  onClose: () => void
  onMove: (status: BookStatus) => void
  anchorRect?: DOMRect | null
}

export function BookCardDropdown({ book, isOpen, onClose, onMove, anchorRect }: BookCardDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen || !anchorRect) return null

  // Calculate position based on the anchor element's position
  const style = {
    position: "fixed" as const,
    top: `${anchorRect.bottom + window.scrollY}px`,
    left: `${anchorRect.right + window.scrollX - 150}px`, // Align to the right of the button
    zIndex: 9999,
  }

  const content = (
    <div
      ref={dropdownRef}
      className="bg-white rounded-md shadow-lg border border-gray-200 py-1 w-40"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {book.status !== "reading" && (
        <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => onMove("reading")}>
          Move to Reading
        </div>
      )}
      {book.status !== "queued" && (
        <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => onMove("queued")}>
          Move to Queued
        </div>
      )}
      {book.status !== "completed" && (
        <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => onMove("completed")}>
          Move to Completed
        </div>
      )}
      {book.status !== "recommended" && (
        <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => onMove("recommended")}>
          Move to Recommendations
        </div>
      )}
      {book.status !== "onHold" && (
        <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => onMove("onHold")}>
          Move to On Hold
        </div>
      )}
    </div>
  )

  // Use createPortal to render the dropdown at the document body level
  return typeof document !== "undefined" ? createPortal(content, document.body) : null
}
