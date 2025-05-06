export default function LearnMoreSection() {
    return (
      <section id="learn-more" className="bg-white py-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Learn More About BookLog</h2>
          <p className="text-lg text-gray-600 mb-12">
            Your personal reading companion — simple, social, and smart.
          </p>
  
          {/* Why Use BookLog */}
          <div className="grid md:grid-cols-2 gap-8 text-left mb-16">
            <Feature
              title="📚 Organize Your Reading Life"
              description="Keep all your books neatly categorized — reading, finished, on hold, or planned."
            />
            <Feature
              title="🧠 Personalized AI Recommendations"
              description="Receive book suggestions based on your reading habits, genres, and prompts."
            />
            <Feature
              title="🔖 Track Everything"
              description="From novels and comics to biographies and essays — track any book in BookLog."
            />
            <Feature
              title="🤝 Share Your Shelf"
              description="Create a view-only version of your collection and share it with friends."
            />
          </div>
  
          {/* How It Works */}
          <div className="text-left">
            <h3 className="text-2xl font-semibold mb-6">How It Works</h3>
            <ol className="space-y-4 text-gray-700 list-decimal list-inside">
              <li><strong>Create Your Account:</strong> Sign up in seconds using just your email.</li>
              <li><strong>Log Your Books:</strong> Add books to different statuses like Reading, On Hold, or Recommended.</li>
              <li><strong>Use AI to Discover Books:</strong> Let our AI recommend titles based on your taste.</li>
              <li><strong>Switch Views:</strong> Toggle between a card grid or table view to suit your style.</li>
              <li><strong>Keep It Social (Optional):</strong> Follow friends or keep your collection private — it's your call.</li>
            </ol>
          </div>
  
          {/* CTA */}
          <div className="mt-16 text-center">
            <h4 className="text-2xl font-semibold mb-4">Ready to Start Reading Smarter?</h4>
            <p className="mb-6 text-gray-600">Join fellow readers organizing their experience with BookLog.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="bg-black text-white py-2 px-6 rounded-full">Get Started — It’s Free</button>
              <button className="border border-black py-2 px-6 rounded-full">Explore Features</button>
            </div>
          </div>
        </div>
      </section>
    );
  }
  
  function Feature({ title, description }: { title: string; description: string }) {
    return (
      <div>
        <h4 className="text-xl font-semibold mb-2">{title}</h4>
        <p className="text-gray-600">{description}</p>
      </div>
    );
  }
  