export default function TestPage() {
  // Get the current time to show this is the updated version
  const currentTime = new Date().toLocaleTimeString()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page - Updated</h1>
      <p>If you can see this, the updated test page is working.</p>
      <p className="mt-4">Current time: {currentTime}</p>

      <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
        <h2 className="font-bold mb-2">Environment Check:</h2>
        <p>NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Available" : "Not available"}</p>
        <p>
          NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Available" : "Not available"}
        </p>
      </div>
    </div>
  )
}
