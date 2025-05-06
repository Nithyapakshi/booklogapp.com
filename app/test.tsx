export default function TestPage() {
  // Get the current time to show this is the updated version
  const currentTime = new Date().toLocaleTimeString()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page (Updated from test.tsx)</h1>
      <p>If you can see this, the test.tsx file is being used.</p>
      <p className="mt-4">Current time: {currentTime}</p>
    </div>
  )
}
