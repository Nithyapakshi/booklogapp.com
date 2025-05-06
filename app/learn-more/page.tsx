import Link from "next/link"

export default function LearnMorePage() {
  return (
    <div className="bg-white min-h-screen text-gray-900">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="text-xl font-bold text-blue-600">
        <Link href="/">BookLog</Link>
        </div>
        <div className="flex items-center gap-6">
        <Link href="/" className="text-sm font-medium text-gray-600 hover:text-blue-600">Home</Link>
        <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600">Log In</Link>
        <Link
            href="/signup"
            className="text-sm font-medium text-white bg-blue-600 px-4 py-2 rounded-md hover:bg-blue-700"
        >
            Sign Up
        </Link>
        </div>
        </div>
      </header>

      {/* Hero / Intro */}
      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl font-bold mb-4">Learn More About BookLog</h1>
        <p className="max-w-2xl mx-auto text-gray-600">
          Your personal reading companion — simple, social, and smart.
        </p>
      </section>

      {/* 4 Feature Blocks */}
      <section className="grid md:grid-cols-2 gap-8 px-4 md:px-16 pb-20">
        <Feature
          title="📚 Organize Your Reading Life"
          description="Track what you’re reading, finished, paused, or planning to read — all in one place."
        />
        <Feature
          title="🧠 AI-Powered Recommendations"
          description="Get book suggestions based on your interests and past reads — instantly."
        />
        <Feature
          title="🔖 Custom Categories"
          description="Use statuses like 'Reading', 'Recommended', and 'On Hold' to stay organized."
        />
        <Feature
          title="🤝 Share Your Shelf"
          description="Create a view-only version of your collection to inspire friends and other readers."
        />
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16 px-4 md:px-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="max-w-3xl mx-auto space-y-6 text-gray-700">
          <Step number="1" text="Create your account — it's quick and free." />
          {/* Step 2 – Rich Format */}
            <div className="space-y-4">
            <div className="flex items-center space-x-4">
                <div className="text-blue-600 font-bold text-xl">2</div>
                <div>
                <h3 className="font-semibold text-lg">Add What You’re Reading</h3>
                <p className="text-gray-600">
                    Use one of the following statuses to organize your books:
                </p>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 pl-10">
                <Status label="In Progress" color="bg-blue-100 text-blue-700" description="Currently reading" />
                <Status label="Recommend" color="bg-yellow-100 text-yellow-800" description="Recommend to others" />
                <Status label="Plan to Read" color="bg-gray-100 text-gray-800" description="Want to read later" />
                <Status label="Finished" color="bg-green-100 text-green-800" description="Completed" />
                <Status label="On Hold" color="bg-rose-100 text-rose-800" description="Taking a break" />
            </div>
            </div>
          <Step number="3" text="Discover new reads using AI-powered suggestions." />
          <Step number="4" text="Share your BookLog with friends — or keep it private." />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to start reading smarter?</h2>
        <Link
          href="/signup"
          className="inline-block bg-blue-600 text-white text-lg font-medium px-8 py-3 rounded-full hover:bg-blue-700 transition"
        >
          Get Started — It’s Free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} BookLog. All rights reserved.
      </footer>
    </div>
  )
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-start space-x-4">
      <div className="text-blue-600 font-bold text-xl">{number}</div>
      <p>{text}</p>
    </div>
  )
}

function Status({
    label,
    color,
    description
  }: {
    label: string
    color: string
    description: string
  }) {
    return (
      <div className={`px-4 py-2 rounded-md font-medium ${color} shadow-sm text-sm`}>
        {label}
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    )
  }
  