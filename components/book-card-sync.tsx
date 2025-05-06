// ... imports remain unchanged
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Trash2, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Book } from "@/types"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import { BookDetailsDialog } from "@/components/book-details-dialog-fix"
import { createPortal } from "react-dom"

interface BookCardProps {
  book: Book
  onBookMoved?: () => void
}

export default function BookCard({ book, onBookMoved }: BookCardProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [dropdownOpen])

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const { error } = await supabase.from("books").delete().eq("id", book.id)
    if (error) {
      console.error("Error deleting book:", error)
      alert("Failed to delete book.")
      return
    }
    onBookMoved?.()
  }

  const moveBook = async (status: string) => {
    if (book.status === status) return
    setDropdownOpen(false)

    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) {
        alert("Not authenticated")
        return
      }

      localStorage.setItem(
        "booklog-active-tab",
        status === "onHold" ? "On Hold" :
        status === "recommended" ? "My recommendation" :
        status.charAt(0).toUpperCase() + status.slice(1)
      )

      // Special case: Completed ➝ Recommended (Duplicate allowed in UI, but only once)
      if (book.status === "completed" && status === "recommended") {
        const { data: existing, error: checkError } = await supabase
          .from("books")
          .select("id")
          .eq("user_id", user.id)
          .eq("title", book.title)
          .eq("author", book.author)
          .eq("status", "recommended")
          .limit(1)

        if (checkError) {
          console.error("Error checking duplicates:", checkError)
          alert("Failed to move book.")
          return
        }

        if (existing.length > 0) {
          alert("Book already exists in Recommended.")
          return
        }

        const newBook = {
          id: crypto.randomUUID(),
          title: book.title,
          author: book.author,
          status: "recommended",
          description: book.description,
          user_id: user.id,
          created_at: new Date().toISOString(),
          ...(book.cover_url || book.cover ? { cover_url: book.cover_url || book.cover } : {}),
        }

        const { error: insertError } = await supabase.from("books").insert(newBook)
        if (insertError) {
          console.error("Insert error:", insertError)
          alert("Could not add to Recommended.")
          return
        }

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          book_id: book.id,
          action_type: "move",
          from_status: book.status,
          to_status: "recommended",
        })

        onBookMoved?.()
        return
      }

      // Normal move (not Completed ➝ Recommended)
      const { error: updateError } = await supabase
        .from("books")
        .update({ status })
        .eq("id", book.id)

      if (updateError) {
        console.error("Update error:", updateError)
        alert("Could not move book.")
        return
      }

      await supabase.from("activity_logs").insert({
        user_id: user.id,
        book_id: book.id,
        action_type: "move",
        from_status: book.status,
        to_status: status,
      })

      onBookMoved?.()
    } catch (err) {
      console.error("Unexpected error:", err)
      alert("Unexpected error moving book.")
    }
  }

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDropdownOpen(!dropdownOpen)
  }

  const handleBookClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".book-dropdown-menu")) return
    setDialogOpen(true)
  }

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-md overflow-hidden relative cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onClick={handleBookClick}
      >
        <div className="relative h-36 w-full">
          {(book.cover || book.cover_url) ? (
            <img
              src={book.cover || book.cover_url}
              alt={book.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                const fallback = `https://covers.openlibrary.org/b/title/${encodeURIComponent(book.title)}-L.jpg`
                const target = e.currentTarget
                target.onerror = null
                target.src = fallback
              }}
            />
          ) : (
            <div className="h-full w-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
              {book.title.charAt(0)}{book.author?.charAt(0)}
            </div>
          )}
          {isHovering && (
            <div className="absolute top-2 right-2">
              <Button variant="destructive" size="sm" onClick={handleRemove} className="h-7 w-7 p-0">
                <Trash2 size={14} />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        </div>

        <div className="p-3">
          <h3 className="font-bold text-sm truncate">{book.title}</h3>
          <p className="text-xs text-gray-600 truncate">{book.author}</p>
          <div className="mt-2 flex justify-between items-center">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded capitalize">
              {book.status === "onHold" ? "On Hold" : book.status}
            </span>
            <div className="relative book-dropdown-menu">
              <Button ref={buttonRef} variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleDropdown}>
                <MoreHorizontal size={14} />
              </Button>

              {dropdownOpen &&
                typeof document !== "undefined" &&
                createPortal(
                  <div
                    ref={dropdownRef}
                    className="fixed bg-white rounded-md shadow-lg border border-gray-200 py-1 z-[9999] w-40 book-dropdown-menu"
                    style={{
                      top: buttonRef.current
                        ? window.innerHeight - buttonRef.current.getBoundingClientRect().bottom < 150
                          ? buttonRef.current.getBoundingClientRect().top - 180
                          : buttonRef.current.getBoundingClientRect().bottom
                        : 0,
                      left: buttonRef.current
                        ? buttonRef.current.getBoundingClientRect().left - 120
                        : 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {book.status !== "reading" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("reading")}>Move to Reading</div>}
                    {book.status !== "queued" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("queued")}>Move to Queued</div>}
                    {book.status !== "completed" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("completed")}>Move to Completed</div>}
                    {book.status === "completed" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("recommended")}>Move to Recommendations</div>}
                    {book.status !== "onHold" && <div className="px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer" onClick={() => moveBook("onHold")}>Move to On Hold</div>}
                  </div>,
                  document.body
                )}
            </div>
          </div>
        </div>
      </div>

      <BookDetailsDialog book={book} open={dialogOpen} onClose={() => setDialogOpen(false)} mode="view" />
    </>
  )
}
