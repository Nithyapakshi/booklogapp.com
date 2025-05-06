"use server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Create a Supabase client for server components only
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
    cookies: {
      get: (name) => {
        return cookies().get(name)?.value
      },
    },
  })
}
