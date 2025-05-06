import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookHeart } from "lucide-react"

export function AiRecommendationCard() {
  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 border border-gray-100 flex flex-col justify-between sticky top-6"
      style={{ minHeight: "350px", maxHeight: "400px" }}
    >
      <div className="text-center">
        <BookHeart className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-4">Ask AI for your next book recommendations</h2>

        <p className="text-gray-700 mb-6">
          Need help finding your next great read? Let our AI suggest books based on your preferences.
        </p>
      </div>

      <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 mt-auto">
        <Link href="/books/ai-recommendations">Get AI Recommendations</Link>
      </Button>
    </div>
  )
}
