import { DirectLoginForm } from "@/components/direct-login-form"
import { BookOpen } from "lucide-react"
import Link from "next/link"

export default function DirectLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-bold text-blue-600">BookLog</span>
      </Link>

      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Direct Login</h1>
        <p className="text-center text-gray-600">Use this login method to fix authentication issues</p>

        <DirectLoginForm />

        <div className="text-center text-sm text-gray-500">
          <p>Having trouble logging in? Try this direct login method.</p>
        </div>
      </div>
    </div>
  )
}
