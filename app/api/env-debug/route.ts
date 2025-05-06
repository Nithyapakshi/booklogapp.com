import { NextResponse } from "next/server"

export async function GET() {
  // Collect all Supabase-related environment variables
  const envVars = {
    // Client-side variables
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 15)}...`
      : null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "exists (masked)" : null,

    // Server-side variables (safely check if they exist)
    SUPABASE_URL: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 15)}...` : null,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? "exists (masked)" : null,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "exists (masked)" : null,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ? "exists (masked)" : null,

    // Database variables
    POSTGRES_URL: process.env.POSTGRES_URL ? "exists (masked)" : null,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL ? "exists (masked)" : null,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? "exists (masked)" : null,
    POSTGRES_USER: process.env.POSTGRES_USER || null,
    POSTGRES_HOST: process.env.POSTGRES_HOST || null,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ? "exists (masked)" : null,
    POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || null,

    // Environment info
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,

    // Timestamp
    timestamp: new Date().toISOString(),
  }

  // Check if the essential variables are present
  const essentialVars = {
    hasPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasPublicSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  return NextResponse.json({
    envVars,
    essentialVars,
    allEssentialVarsPresent: Object.values(essentialVars).every(Boolean),
  })
}
