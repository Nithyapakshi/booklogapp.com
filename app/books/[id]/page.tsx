import { redirect } from "next/navigation"

// The legacy detail page was a demo. Real book details are in the library dialog.
export default function BookDetailPage() {
  redirect("/books")
}
