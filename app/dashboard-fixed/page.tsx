import { Plus, BookOpen, BookCheck, BookMarked } from "lucide-react"
import Link from "next/link"

export default function DashboardFixedPage() {
  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Add Book
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-500">Currently Reading</h2>
            <BookOpen className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">3 Books</p>
          <p className="text-xs text-gray-500">+1 from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-500">Books Read</h2>
            <BookCheck className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">24 Books</p>
          <p className="text-xs text-gray-500">+3 from last month</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-500">Want to Read</h2>
            <BookMarked className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold">12 Books</p>
          <p className="text-xs text-gray-500">+2 from last month</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Currently Reading
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Completed
            </button>
            <button className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
              Want to Read
            </button>
          </nav>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((book) => (
            <div key={book} className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-bold">The Great Gatsby</h3>
              <p className="text-sm text-gray-500 mb-4">F. Scott Fitzgerald</p>
              <div className="flex justify-between text-sm mb-2">
                <span>Progress: 65%</span>
                <span>180/276 pages</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: "65%" }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debug section */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Fixed Dashboard</h2>
        <p>If you can see this section, you are successfully authenticated and viewing the fixed dashboard.</p>
        <div className="mt-4 flex space-x-4">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Try Original Dashboard
          </Link>
          <Link href="/dashboard-direct" className="text-blue-600 hover:underline">
            Try Direct Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
