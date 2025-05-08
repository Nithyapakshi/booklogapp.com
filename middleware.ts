import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl
  const pathname = url.pathname

  console.log("🌐 Incoming request to:", pathname)

  // ✅ Skip middleware for reset-password route
  if (pathname.startsWith('/reset-password')) {
    console.log("✅ Skipping middleware for /reset-password")
    return NextResponse.next()
  }

  // Add more exclusions here if needed, like forgot-password or auth
  // if (pathname.startsWith('/forgot-password')) return NextResponse.next()

  // ✅ Add your protected route logic below (example)
  // const token = request.cookies.get('sb-access-token')?.value
  // if (!token) {
  //   return NextResponse.redirect(new URL('/login', request.url))
  // }

  // Default allow through
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next).*)'], // exclude only _next for now
}

