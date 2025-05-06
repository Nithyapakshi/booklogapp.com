export default function TailwindTest() {
  return (
    <div className="p-8 max-w-md mx-auto mt-10">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">Tailwind Test</h1>
      <p className="text-gray-700 mb-4">This text should be gray if Tailwind is working.</p>
      <div className="bg-blue-100 p-4 rounded-lg">
        <p className="text-blue-800">This should have a blue background if Tailwind is working.</p>
      </div>
      <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Blue Button</button>
    </div>
  )
}
