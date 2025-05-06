export default function TestNoMiddlewarePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page (No Middleware)</h1>
      <p>This page should load even if middleware is broken.</p>
      <p className="mt-4">Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  )
}
