import { DirectLoginFix } from "@/components/direct-login-fix"
import { BookOpen } from "lucide-react"
import Link from "next/link"

export default function LoginFixPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-blue-600" />
        <span className="text-xl font-bold text-blue-600">BookLog</span>
      </Link>

      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Fixed Login</h1>
        <p className="text-center text-gray-600">This login ensures proper session storage</p>

        <DirectLoginFix />

        <div className="text-center text-sm text-gray-500">
          <p>This login method fixes authentication issues by ensuring proper session storage.</p>
        </div>
      </div>
    </div>
  )
}
