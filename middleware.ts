import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  console.log("🌐 Incoming request to:", pathname)

  // ✅ Skip exact reset-password path
  if (pathname === '/reset-password') {
    console.log("✅ Skipping middleware for /reset-password")
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next).*)'], // only exclude internal Next.js paths
}
