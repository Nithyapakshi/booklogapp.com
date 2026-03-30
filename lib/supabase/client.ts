import { createClient } from "@supabase/supabase-js"

// Create a singleton for client-side usage
let clientSupabaseInstance: ReturnType<typeof createClient> | null = null

export const createClientSupabaseClient = () => {
  if (clientSupabaseInstance) return clientSupabaseInstance

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables")
    throw new Error("Missing Supabase environment variables")
  }

  console.log("Creating new Supabase client with URL:", supabaseUrl.substring(0, 15) + "...")

  clientSupabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      storageKey: "supabase-auth-token",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return clientSupabaseInstance
}
