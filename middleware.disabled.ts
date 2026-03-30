import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Define protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/profile", "/books"]
  const path = request.nextUrl.pathname

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) => path === route || path.startsWith(`${route}/`))

  // If it's not a protected route, allow the request to proceed
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // For protected routes, check for auth cookies
  const hasAuthCookie =
    request.cookies.has("sb-access-token") ||
    request.cookies.has("sb-refresh-token") ||
    request.cookies.has("supabase-auth-token")

  // If no auth cookie is found, redirect to login with the redirect path
  if (!hasAuthCookie) {
    const redirectUrl = new URL(`/login`, request.url)
    redirectUrl.searchParams.set("redirect", path)
    return NextResponse.redirect(redirectUrl)
  }

  // If we have an auth cookie, allow the request
  return NextResponse.next()
}

// Configure which paths this middleware will run on
export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/books/:path*"],
}
