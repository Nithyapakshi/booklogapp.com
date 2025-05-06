import type { User } from "@supabase/supabase-js"

/**
 * Extracts the first name from a user object, checking various possible locations
 * where the name might be stored.
 */
export function getUserFirstName(user: User | null): string {
  if (!user) return "User"

  // Check user_metadata (most common location)
  if (user.user_metadata) {
    if (user.user_metadata.first_name) return user.user_metadata.first_name
    if (user.user_metadata.firstName) return user.user_metadata.firstName
    if (user.user_metadata.name) {
      const nameParts = user.user_metadata.name.split(" ")
      return nameParts[0]
    }
  }

  // Check app_metadata (less common)
  if (user.app_metadata) {
    if (user.app_metadata.first_name) return user.app_metadata.first_name
    if (user.app_metadata.firstName) return user.app_metadata.firstName
    if (user.app_metadata.name) {
      const nameParts = user.app_metadata.name.split(" ")
      return nameParts[0]
    }
  }

  // Check root level properties
  if (typeof user.first_name === "string") return user.first_name
  if (typeof user.firstName === "string") return user.firstName
  if (typeof user.name === "string") {
    const nameParts = user.name.split(" ")
    return nameParts[0]
  }

  // Fall back to email username if available
  if (user.email) {
    return user.email.split("@")[0]
  }

  // Last resort fallback
  return "User"
}
