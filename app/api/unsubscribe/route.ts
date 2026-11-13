import { unsubscribeFromEmails } from "@/app/actions/unsubscribe"

// One-click unsubscribe from the mail app's own Unsubscribe button (RFC 8058).
// POST only: link scanners that open URLs with GET can never unsubscribe anyone.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") || ""
  const result = await unsubscribeFromEmails(token)
  if (result === "failed") return new Response("Could not unsubscribe. Please try again.", { status: 500 })
  if (result === "invalid") return new Response("Unknown unsubscribe link.", { status: 404 })
  return new Response("Unsubscribed.", { status: 200 })
}
