"use client"

import type React from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProviderFixed({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Create a new Supabase client for each request to avoid stale data
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // Check active session
    const getSession = async () => {
      setIsLoading(true)
      try {
        console.log("AuthProvider: Checking session...")
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        console.log("AuthProvider: Session check result:", { session, error })

        if (error) {
          console.error("AuthProvider: Session error:", error)
        } else if (session) {
          console.log("AuthProvider: Session found, user is authenticated")
          setSession(session)
          setUser(session.user)
        } else {
          console.log("AuthProvider: No session found, user is not authenticated")
          setSession(null)
          setUser(null)
        }
      } catch (err) {
        console.error("AuthProvider: Unexpected error checking session:", err)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("AuthProvider: Auth state changed:", { event, session })
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Update the signIn function to handle errors better
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { data, error }
    } catch (err) {
      console.error("Sign in error:", err)
      return {
        data: { user: null, session: null },
        error: new Error(err instanceof Error ? err.message : "Failed to sign in"),
      }
    }
  }

  // Update the signUp function to handle errors better
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      return { data, error }
    } catch (err) {
      console.error("Sign up error:", err)
      return {
        data: { user: null, session: null },
        error: new Error(err instanceof Error ? err.message : "Failed to sign up"),
      }
    }
  }

  const signOut = async () => {
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

export const useAuthFixed = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
