"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, Plus, BookMarked, BookCheck } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useBooks, type BookStatus } from "@/lib/book-context"

export default function DashboardPage() {
  const { user, isLoading, signOut } = useAuth()
  const { books, loading } = useBooks()
  const [status, setStatus] = useState<BookStatus>("reading")
  if (isLoading || loading) return <main className="container px-4 py-8">Loading your library...</main>
  if (!user) return <main className="container px-4 py-8"><h1 className="text-2xl font-bold mb-4">Authentication Required</h1><Link href="/login" className="text-blue-600">Go to Login</Link></main>
  const lists = [{status:"reading" as const,label:"Currently Reading",Icon:BookOpen},{status:"completed" as const,label:"Books Read",Icon:BookCheck},{status:"queued" as const,label:"Want to Read",Icon:BookMarked}]
  return <div className="flex min-h-screen flex-col">
    <header className="border-b"><div className="container px-4 sm:px-6 flex min-h-16 items-center justify-between gap-4 py-4"><Link href="/dashboard" className="text-xl font-bold text-blue-600">BookLog</Link><nav className="flex items-center gap-4 text-sm"><Link href="/books">My Books</Link><button onClick={async()=>{await signOut();window.location.href="/"}}>Sign Out</button></nav></div></header>
    <main className="flex-1 container px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6"><h1 className="text-3xl font-bold">Dashboard</h1><Link href="/books/add" className="inline-flex items-center px-4 py-2 text-sm rounded-md text-white bg-blue-600"><Plus className="h-4 w-4 mr-2"/>Add Book</Link></div>
      <div className="grid gap-6 md:grid-cols-3">{lists.map(({status,label,Icon})=><div key={status} className="bg-white p-6 rounded-lg border"><div className="flex justify-between mb-4"><h2 className="text-sm text-gray-500">{label}</h2><Icon className="h-4 w-4 text-gray-400"/></div><p className="text-2xl font-bold">{books[status].length} {books[status].length===1?"Book":"Books"}</p></div>)}</div>
      <nav className="flex gap-6 border-b mt-8 overflow-x-auto">{lists.map(x=><button key={x.status} onClick={()=>setStatus(x.status)} className={`whitespace-nowrap py-4 border-b-2 text-sm ${status===x.status?"border-blue-500 text-blue-600":"border-transparent text-gray-500"}`}>{x.label}</button>)}</nav>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{books[status].map(book=><Link key={book.rowId||book.id} href="/books" className="bg-white p-6 rounded-lg border"><h3 className="font-bold">{book.title}</h3><p className="text-sm text-gray-500 mt-2">{book.author}</p></Link>)}</div>
      {!books[status].length&&<p className="text-gray-500 py-6">No books in this list yet.</p>}
    </main>
  </div>
}
