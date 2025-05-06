export default function SimpleTestPage() {
  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Simple Test Page</h1>
      <p className="text-gray-700">This is a simple test page that doesn't rely on any authentication or middleware.</p>
      <p className="mt-4 text-gray-500">Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  )
}
