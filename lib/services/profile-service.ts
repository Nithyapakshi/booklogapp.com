import { createClientSupabaseClient } from "@/lib/supabase/client"
import type { Profile } from "@/types/database"

export class ProfileService {
  // Fetch the current user's profile
  static async fetchUserProfile(): Promise<Profile | null> {
    try {
      const supabase = createClientSupabaseClient()

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        throw new Error("User not authenticated")
      }

      // Get profile
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userData.user.id).single()

      if (error) {
        if (error.code === "PGRST116") {
          // No profile found
          return null
        }
        throw error
      }

      // Transform to our Profile type
      return {
        id: data.id,
        userId: data.user_id,
        name: data.name || userData.user.email?.split("@")[0] || "User",
        email: data.email || userData.user.email || "",
        avatarUrl: data.avatar_url || "",
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      throw error
    }
  }

  // Update the user's profile
  static async updateProfile(profile: Partial<Profile>): Promise<Profile> {
    try {
      const supabase = createClientSupabaseClient()

      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        throw new Error("User not authenticated")
      }

      // Update profile
      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: userData.user.id,
            name: profile.name,
            email: profile.email,
            avatar_url: profile.avatarUrl,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single()

      if (error) {
        throw error
      }

      // Return updated profile
      return {
        id: data.id,
        userId: data.user_id,
        name: data.name || userData.user.email?.split("@")[0] || "User",
        email: data.email || userData.user.email || "",
        avatarUrl: data.avatar_url || "",
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      throw error
    }
  }
}
