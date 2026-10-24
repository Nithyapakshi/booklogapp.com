// Only the app's one-book Save route may survive authentication. Never accept
// arbitrary redirect URLs, protocol-relative paths, or an external origin.
export function safeAuthReturn(value: string | null | undefined): string {
  return value && /^\/s\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\?save=1$/i.test(value) ? value : "/books"
}
export function authReturnFromLocation(): string {
  if (typeof window === "undefined") return "/books"
  return safeAuthReturn(new URL(window.location.href).searchParams.get("next"))
}
export function callbackUrl(): string {
  const next = authReturnFromLocation()
  return `${window.location.origin}/auth/callback${next === "/books" ? "" : `?next=${encodeURIComponent(next)}`}`
}
