"use client"
// One "Are you sure?" step before a book is removed from the library.
// Removing deletes the book with its notes, rating and dates, so a stray tap must not do it.
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { track } from "@/lib/usage"

export function ConfirmRemoveBook({ open, title, from, onCancel, onConfirm }: {
  open: boolean; title: string; from: "list_menu" | "grid_card" | "up_next"; onCancel: () => void; onConfirm: () => void
}) {
  return <AlertDialog open={open} onOpenChange={v => { if (!v) onCancel() }}>
    <AlertDialogContent className="w-[calc(100vw-24px)] max-w-[400px] rounded-lg" onClick={e => e.stopPropagation()}>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove this book?</AlertDialogTitle>
        <AlertDialogDescription className="break-words">"{title}" and its notes, rating and dates will be removed from your library.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => { track("book.remove_cancelled", { from }); onCancel() }}>Keep book</AlertDialogCancel>
        <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={onConfirm}>Remove</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
}
