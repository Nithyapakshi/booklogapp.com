import Link from "next/link"
import { BookOpen } from "lucide-react"

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-8 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-bold text-blue-600">BookLog</span>
      </div>

      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Authentication Required</h1>
        <p className="text-center text-gray-600">You need to be logged in to access this page.</p>

        <div className="flex flex-col gap-4">
          <Link
            href="/login"
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-center"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-center"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
