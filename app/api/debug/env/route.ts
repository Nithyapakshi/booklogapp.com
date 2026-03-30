import { NextResponse } from "next/server"

export async function GET() {
  // Collect all environment variables related to Supabase
  const envVars = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

  // Mask the keys for security but show if they exist
  const maskedEnvVars = {
    SUPABASE_URL: envVars.SUPABASE_URL ? `${envVars.SUPABASE_URL.substring(0, 8)}...` : null,
    NEXT_PUBLIC_SUPABASE_URL: envVars.NEXT_PUBLIC_SUPABASE_URL
      ? `${envVars.NEXT_PUBLIC_SUPABASE_URL.substring(0, 8)}...`
      : null,
    SUPABASE_ANON_KEY: envVars.SUPABASE_ANON_KEY ? "exists" : null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "exists" : null,
    SUPABASE_SERVICE_ROLE_KEY: envVars.SUPABASE_SERVICE_ROLE_KEY ? "exists" : null,
    NODE_ENV: envVars.NODE_ENV,
  }

  return NextResponse.json({
    envVars: maskedEnvVars,
    timestamp: new Date().toISOString(),
  })
}
