export default function TestNewPage() {
  // Get the current time to show this is the new version
  const currentTime = new Date().toLocaleTimeString()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">New Test Page</h1>
      <p>If you can see this, the new test page is working.</p>
      <p className="mt-4">Current time: {currentTime}</p>

      <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
        <h2 className="font-bold mb-2">File Structure Check:</h2>
        <p>This file is located at: app/test-new/page.tsx</p>
      </div>
    </div>
  )
}
