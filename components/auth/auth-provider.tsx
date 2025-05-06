"use client"

import type React from "react"
import { createClientSupabaseClient } from "@/lib/supabase/client"
import type { Session, User } from "@supabase/supabase-js"
import { createContext, useContext, useEffect, useState } from "react"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null }
  }>
  signUp: (
    email: string,
    password: string,
  ) => Promise<{
    error: Error | null
    data: { user: User | null; session: Session | null }
  }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<boolean>
}

// Create a default context value
const defaultContextValue: AuthContextType = {
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => ({ error: new Error("Not implemented"), data: { user: null, session: null } }),
  signUp: async () => ({ error: new Error("Not implemented"), data: { user: null, session: null } }),
  signOut: async () => {},
  refreshSession: async () => false,
}

const AuthContext = createContext<AuthContextType>(defaultContextValue)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClientSupabaseClient> | null>(null)

  // Initialize Supabase client
  useEffect(() => {
    try {
      const client = createClientSupabaseClient()
      setSupabase(client)
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err)
      setIsLoading(false)
    }
  }, [])

  // Check active session when Supabase client is ready
  useEffect(() => {
    if (!supabase) return

    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          // Handle session error gracefully
          console.error("Session error:", error)
          // Try to refresh the session
          await refreshSession()
        } else if (data.session) {
          setSession(data.session)
          setUser(data.session.user)
        }
      } catch (err) {
        console.error("Unexpected error checking session:", err)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event)
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Auth methods
  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return {
        data: { user: null, session: null },
        error: new Error("Supabase client not initialized"),
      }
    }

    try {
      return await supabase.auth.signInWithPassword({ email, password })
    } catch (err) {
      console.error("Sign in error:", err)
      return {
        data: { user: null, session: null },
        error: new Error(err instanceof Error ? err.message : "Failed to sign in"),
      }
    }
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      return {
        data: { user: null, session: null },
        error: new Error("Supabase client not initialized"),
      }
    }

    try {
      return await supabase.auth.signUp({ email, password })
    } catch (err) {
      console.error("Sign up error:", err)
      return {
        data: { user: null, session: null },
        error: new Error(err instanceof Error ? err.message : "Failed to sign up"),
      }
    }
  }

  // Update the signOut method to properly clear all authentication data

  const signOut = async () => {
    if (!supabase) return

    try {
      await supabase.auth.signOut()

      // Clear ALL local storage items related to authentication
      if (typeof window !== "undefined") {
        // Clear Supabase auth items
        localStorage.removeItem("supabase-auth-token")
        localStorage.removeItem("sb-access-token")
        localStorage.removeItem("sb-refresh-token")

        // Clear our custom auth items
        localStorage.removeItem("booklog-auth")
        localStorage.removeItem("booklog-user")
      }

      // Reset state
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  // Add a method to refresh the session
  const refreshSession = async (): Promise<boolean> => {
    if (!supabase) return false

    try {
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error("Error refreshing session:", error)
        return false
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
        return true
      }

      return false
    } catch (error) {
      console.error("Error refreshing session:", error)
      return false
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
