import type { MetadataRoute } from "next"
import { PUBLIC_ORIGIN } from "@/lib/public-discovery"

// Search crawlers follow the same public-only policy. This is not access control.
// No private libraries, user profiles, named snapshots, auth or debug URLs in discovery.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/home", "/privacy"],
      disallow: ["/actions", "/api", "/auth", "/auth-check", "/auth-debug", "/auth-diagnostic", "/auth-direct", "/auth-inline", "/auth-simple", "/auth-status", "/auth-test", "/basic-dashboard", "/books", "/books-direct", "/dashboard", "/dashboard-direct", "/dashboard-fixed", "/dashboard-simple", "/dashboard-test", "/debug", "/debug-dashboard", "/direct-login", "/env-check", "/env-debug", "/feedback", "/file-check", "/forgot-password", "/home-debug", "/login", "/login-direct", "/login-fixed", "/login-simple", "/login-standalone", "/login-test", "/minimal", "/profile", "/reset-password", "/s/", "/schema-check", "/settings", "/signup", "/simple-dashboard", "/simple-test", "/style-test", "/supabase-connect-test", "/test", "/test-middleware", "/test-new", "/test-no-middleware", "/test-page", "/u/"],
    }],
    sitemap: `${PUBLIC_ORIGIN}/sitemap.xml`,
  }
}
