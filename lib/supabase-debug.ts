import { createClient } from "@supabase/supabase-js"

// Create a singleton for client-side usage with better debugging
let clientSupabaseInstance: ReturnType<typeof createClient> | null = null

export const createDebugSupabaseClient = () => {
  if (clientSupabaseInstance) {
    console.log("Using existing Supabase client instance")
    return clientSupabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables:", {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
    })
    throw new Error("Missing Supabase environment variables")
  }

  console.log("Creating new Supabase client with:", {
    url: supabaseUrl.substring(0, 8) + "...",
    keyExists: !!supabaseKey,
  })

  clientSupabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      storageKey: "booklog-auth-debug",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return clientSupabaseInstance
}
