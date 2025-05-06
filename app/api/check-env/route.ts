import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Available" : "Not available",
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Available" : "Not available",
    serverTime: new Date().toISOString(),
  })
}
