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
  onDelete?: () => void
  buttonElement: HTMLElement | null
}

export function BookCardDropdown({
  book,
  isOpen,
  onClose,
  onMove,
  onDelete,
  buttonElement,
}: BookCardDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonElement &&
        !buttonElement.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose, buttonElement])

  if (!isOpen || !buttonElement) return null

  const rect = buttonElement.getBoundingClientRect()
  const top = rect.top - 10
  const left = rect.left - 120 + rect.width / 2

  const content = (
    <div
      ref={dropdownRef}
      className="book-dropdown-menu fixed bg-white rounded-md shadow-lg border border-gray-200 py-1 w-40"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        transform: "translateY(-100%)",
        zIndex: 9999,
      }}
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

      {onDelete && (
        <>
          <div className="my-1 border-t border-gray-200" />
          <div
            className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 cursor-pointer"
            onClick={onDelete}
          >
            Delete
          </div>
        </>
      )}
    </div>
  )

  return typeof document !== "undefined" ? createPortal(content, document.body) : null
}
