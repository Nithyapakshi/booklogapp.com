export function middleware(request) {
  const url = request.nextUrl

  // ✅ Skip middleware for password reset to preserve access_token in URL
  if (url.pathname.startsWith('/reset-password')) {
    return
  }

  // ✅ Add any other global middleware logic here, if needed
  return
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],  // Applies to all routes except _next, favicon
}
