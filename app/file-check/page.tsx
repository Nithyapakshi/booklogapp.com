export default function FileCheckPage() {
  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">File Structure Check</h1>
      <p className="text-gray-700">If you can see this page, the file structure is working correctly.</p>
      <p className="mt-4 text-gray-500">Current time: {new Date().toLocaleTimeString()}</p>

      <div className="mt-6 p-4 bg-yellow-100 rounded">
        <h2 className="font-bold mb-2">Debug Info:</h2>
        <p>This file is located at: app/file-check/page.tsx</p>
      </div>
    </div>
  )
}
