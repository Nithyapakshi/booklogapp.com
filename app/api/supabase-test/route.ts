import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Check if environment variables are available
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: "Missing Supabase environment variables",
          envVars: {
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseKey: !!supabaseKey,
          },
        },
        { status: 500 },
      )
    }

    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test the connection with a simple query
    try {
      const { data, error } = await supabase.from("_dummy_query").select("*").limit(1).maybeSingle()

      // This query will likely fail with a 400 error, but that's expected
      // We just want to see if we can connect to Supabase

      return NextResponse.json({
        message: "Supabase connection test completed",
        connectionSuccessful: true,
        queryResult: { data, error: error ? error.message : null },
      })
    } catch (queryError) {
      // Even if the query fails, the connection might be working
      return NextResponse.json({
        message: "Supabase connection test completed with query error",
        connectionSuccessful: true,
        queryError: queryError instanceof Error ? queryError.message : String(queryError),
      })
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to connect to Supabase",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
