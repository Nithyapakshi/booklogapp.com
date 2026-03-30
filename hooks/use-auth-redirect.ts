"use client"

import { useAuth } from "@/components/auth-provider"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect } from "react"

export function useAuthRedirect() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isLoading) {
      const redirect = searchParams.get("redirect") || "/dashboard"

      if (user) {
        router.push(redirect)
      }
    }
  }, [user, isLoading, router, searchParams])

  return { isLoading }
}
