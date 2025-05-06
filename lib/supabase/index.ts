// Only export the client version by default
export { createClientSupabaseClient } from "./client"

// Don't export the server version from the index file
// This prevents accidental imports in client components
