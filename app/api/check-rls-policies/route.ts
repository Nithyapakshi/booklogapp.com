import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    // Create a Supabase client using environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: "Missing Supabase environment variables",
          envVars: {
            supabaseUrl: !!process.env.SUPABASE_URL || !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.SUPABASE_ANON_KEY,
          },
        },
        { status: 500 },
      )
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Query to get RLS policies for the books table
    const { data: policies, error: policiesError } = await supabase.rpc("get_table_policies", { table_name: "books" })

    if (policiesError) {
      return NextResponse.json({ error: policiesError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "RLS policies retrieved successfully",
      policies,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to retrieve RLS policies",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
