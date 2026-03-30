"use client"

import Link from "next/link"
import { Home, BookOpen } from "lucide-react"
import { usePathname } from "next/navigation"

interface HeaderProps {
  userName?: string
  userInitials?: string
}

export default function Header({ userName = "User", userInitials = "U" }: HeaderProps) {
  const pathname = usePathname()

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <Link href="/books" className="text-xl font-bold text-blue-600">
            BookLog
          </Link>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="/books" className="text-sm font-medium flex items-center gap-1">
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>

          <Link href="/profile" className="flex items-center gap-3">
            <span className="text-sm font-medium">{userName}</span>
            <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
              {userInitials}
            </div>
          </Link>
        </nav>
      </div>
    </header>
  )
}
