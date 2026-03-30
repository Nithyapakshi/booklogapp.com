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
}

// Create a default context value
const defaultContextValue: AuthContextType = {
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => ({ error: new Error("Not implemented"), data: { user: null, session: null } }),
  signUp: async () => ({ error: new Error("Not implemented"), data: { user: null, session: null } }),
  signOut: async () => {},
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
          // Don't set error state, just continue with null user/session
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

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
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
