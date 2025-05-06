export default function DirectTestPage() {
  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Direct Test Page</h1>
      <p className="text-gray-700">This is a direct test page that doesn't use the page.tsx convention.</p>
      <p className="mt-4 text-gray-500">Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  )
}
