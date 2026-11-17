// Email unsubscribe links. The link carries only a random token, never an account id or email.
import { PUBLIC_ORIGIN } from "@/lib/public-discovery"

const TOKEN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUnsubscribeToken(value: unknown): value is string {
  return typeof value === "string" && TOKEN.test(value)
}

// The visible link in the email footer: opens a page with one Unsubscribe button.
export function unsubscribePageUrl(token: string): string {
  return `${PUBLIC_ORIGIN}/unsubscribe?t=${encodeURIComponent(token)}`
}

// The List-Unsubscribe header target: mail apps (Gmail, Apple Mail) POST here for one-click unsubscribe.
export function unsubscribeOneClickUrl(token: string): string {
  return `${PUBLIC_ORIGIN}/api/unsubscribe?t=${encodeURIComponent(token)}`
}

// Headers every BookLog reader email must carry (RFC 8058 one-click unsubscribe).
export function unsubscribeHeaders(token: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeOneClickUrl(token)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}
