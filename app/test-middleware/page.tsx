export default function TestMiddlewarePage() {
  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Middleware Test Page</h1>
      <p className="text-gray-700">If you can see this page, middleware is disabled.</p>
      <p className="mt-4 text-gray-500">Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  )
}
