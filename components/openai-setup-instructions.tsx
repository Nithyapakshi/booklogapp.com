import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function OpenAISetupInstructions() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start mb-4">
        <AlertCircle className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
        <h2 className="text-xl font-bold">Set Up OpenAI API Key</h2>
      </div>

      <p className="mb-4">
        To enable AI-powered book recommendations, you need to add your OpenAI API key to the environment variables.
      </p>

      <div className="bg-gray-50 p-4 rounded-md mb-4">
        <h3 className="font-semibold mb-2">Follow these steps:</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Sign up for an account at{" "}
            <Link
              href="https://platform.openai.com/signup"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenAI
            </Link>
          </li>
          <li>
            Navigate to the{" "}
            <Link
              href="https://platform.openai.com/api-keys"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              API keys page
            </Link>
          </li>
          <li>Create a new secret key</li>
          <li>
            Add the key to your project's environment variables as{" "}
            <code className="bg-gray-200 px-1 py-0.5 rounded">OPENAI_API_KEY</code>
          </li>
        </ol>
      </div>

      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <h3 className="font-semibold mb-2">For Vercel deployment:</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Go to your project in the Vercel dashboard</li>
          <li>Navigate to Settings → Environment Variables</li>
          <li>
            Add a new variable with the name <code className="bg-blue-100 px-1 py-0.5 rounded">OPENAI_API_KEY</code> and
            your API key as the value
          </li>
          <li>Redeploy your application</li>
        </ol>
      </div>

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
            Get OpenAI API Key
          </Link>
        </Button>
      </div>
    </div>
  )
}
