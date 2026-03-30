export default function DashboardTestPage() {
  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-blue-600 mb-4">Dashboard Test Page</h1>
      <p className="text-gray-700">This is a test dashboard page that doesn't require authentication.</p>
      <div className="mt-4 p-4 bg-green-100 rounded">
        <p className="text-sm text-green-800">
          If you can see this styled box with green background and text, the page is working!
        </p>
      </div>
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Stats</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm text-gray-500">Books Read</h3>
            <p className="text-2xl font-bold">24</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm text-gray-500">Currently Reading</h3>
            <p className="text-2xl font-bold">3</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm text-gray-500">Want to Read</h3>
            <p className="text-2xl font-bold">12</p>
          </div>
        </div>
      </div>
    </div>
  )
}
