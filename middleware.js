// Export a middleware function that just passes the request through
export function middleware(request) {
  // This middleware does nothing and allows all requests to pass through
  return
}

// Configure middleware to run on no paths (effectively disabling it)
export const config = {
  matcher: [],
}
