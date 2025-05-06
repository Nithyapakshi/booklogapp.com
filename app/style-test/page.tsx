export default function StyleTestPage() {
  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Style Test Page</h1>
      <p className="text-gray-700">This is a test page to verify that Tailwind CSS is working correctly.</p>
      <div className="mt-4 p-4 bg-blue-100 rounded">
        <p className="text-sm text-blue-800">
          If you can see this styled box with blue background and text, Tailwind CSS is working!
        </p>
      </div>
      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Test Button</button>
    </div>
  )
}
