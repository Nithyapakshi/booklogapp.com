"use client"

import { useEffect, useState } from "react"

export default function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Don't render anything during SSR
  if (!isMounted) return null

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"} text-white`}
    >
      {isOnline ? "Online" : "Offline"}
    </div>
  )
}
