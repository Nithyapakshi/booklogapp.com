"use client"

import { useBooks } from "@/lib/book-context-sync"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"

export function SyncStatusIndicator() {
  const { syncStatus } = useBooks()

  return (
    <div className="flex items-center gap-1 text-sm">
      {syncStatus.online ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-yellow-500" />
      )}

      {syncStatus.syncing && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}

      <span className="text-xs text-gray-500">
        {syncStatus.online ? (syncStatus.syncing ? "Syncing..." : "Online") : "Offline"}
      </span>
    </div>
  )
}
