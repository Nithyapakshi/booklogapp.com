import Link from "next/link"
import { BookOpen, Library, Share2, Bug } from "lucide-react"

export default function HomeDebugPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-blue-600">BookLog</span>
          </div>
          <nav className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Debug Panel */}
      <div className="bg-yellow-100 p-6 border-b border-yellow-200">
        <div className="container">
          <div className="flex items-center gap-2 mb-4">
            <Bug className="h-5 w-5 text-yellow-700" />
            <h2 className="text-lg font-bold text-yellow-800">Debug Panel</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-bold mb-2 text-yellow-800">Test Pages</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/simple-test" className="text-blue-600 hover:underline">
                    Simple Test Page
                  </Link>
                </li>
                <li>
                  <Link href="/test-no-middleware" className="text-blue-600 hover:underline">
                    No Middleware Test
                  </Link>
                </li>
                <li>
                  <Link href="/books" className="text-blue-600 hover:underline">
                    Books Page
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-yellow-800">Authentication</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/auth-diagnostic" className="text-blue-600 hover:underline font-bold">
                    Auth Diagnostic Tool (New)
                  </Link>
                </li>
                <li>
                  <Link href="/login-standalone" className="text-blue-600 hover:underline">
                    Standalone Login
                  </Link>
                </li>
                <li>
                  <Link href="/login-simple" className="text-blue-600 hover:underline">
                    Simple Login
                  </Link>
                </li>
                <li>
                  <Link href="/auth-test" className="text-blue-600 hover:underline">
                    Auth Test
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-2 text-yellow-800">Diagnostics</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/env-debug" className="text-blue-600 hover:underline">
                    Environment Debug
                  </Link>
                </li>
                <li>
                  <Link href="/supabase-connect-test" className="text-blue-600 hover:underline">
                    Supabase Connection Test
                  </Link>
                </li>
                <li>
                  <Link href="/api/env-debug" className="text-blue-600 hover:underline">
                    API Environment Debug
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="flex-1">
        <div className="container flex flex-col items-center justify-center space-y-8 py-12 text-center md:py-24">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">Track your reading journey</h1>
            <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
              Manage your book collection, track your reading progress, and discover new books to read.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Get started for free
            </Link>
            <Link
              href="/about"
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-gray-50">
        <div className="container py-12 md:py-24">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-sm">
              <BookOpen className="h-12 w-12 mb-4 text-blue-600" />
              <h3 className="text-xl font-bold mb-2">Track Your Books</h3>
              <p className="text-gray-600">
                Keep a record of your reading progress, set goals, and never lose track of what you're reading.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-sm">
              <Library className="h-12 w-12 mb-4 text-blue-600" />
              <h3 className="text-xl font-bold mb-2">Organize Your Collection</h3>
              <p className="text-gray-600">
                Create custom shelves, categorize your books by genre, and maintain a well-organized library.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 bg-white rounded-lg shadow-sm">
              <Share2 className="h-12 w-12 mb-4 text-blue-600" />
              <h3 className="text-xl font-bold mb-2">Share Recommendations</h3>
              <p className="text-gray-600">
                Connect with friends, share your favorite reads, and discover new books from recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center">
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} BookLog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
