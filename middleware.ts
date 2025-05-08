import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  console.log("🌐 Incoming request to:", pathname)

  // ✅ Skip middleware for reset-password route
  if (pathname === '/reset-password') {
    console.log("✅ Skipping middleware for /reset-password")
    return NextResponse.next()
  }

  // ✅ Default allow
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next).*)'], // Exclude _next and allow all other routes to pass through middleware
}
