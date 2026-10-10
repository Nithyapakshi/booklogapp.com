'use server';
import { createClient } from "@supabase/supabase-js"

// Create a Supabase client for server components only
export const createServerSupabaseClient = async () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },

  })
}
