import Link from "next/link"

export default function DebugRoutesPage() {
  // List of routes to test
  const routes = [
    { path: "/", name: "Home" },
    { path: "/login", name: "Login" },
    { path: "/signup", name: "Signup" },
    { path: "/dashboard", name: "Dashboard" },
    { path: "/books", name: "Books" },
    { path: "/test", name: "Test" },
    { path: "/hello", name: "Hello" },
    { path: "/debug/auth", name: "Debug Auth" },
    { path: "/debug/login", name: "Debug Login" },
    { path: "/api/debug/env", name: "API: Debug Env" },
  ]

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug Routes</h1>
      <p className="mb-6">Click on the links below to test if routes are working correctly:</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routes.map((route) => (
          <Link
            key={route.path}
            href={route.path}
            className="p-4 bg-white border rounded-lg hover:bg-gray-50 flex justify-between items-center"
          >
            <span>{route.name}</span>
            <span className="text-gray-500 text-sm">{route.path}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
