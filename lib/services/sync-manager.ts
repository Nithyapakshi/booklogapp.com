// A simplified version of the sync manager that only provides the types and functions needed
// without implementing complex offline sync functionality

export interface SyncStatus {
  online: boolean
  syncing: boolean
}

// Simple sync manager that just tracks online status
class SyncManager {
  private isOnline: boolean = navigator.onLine
  private syncListeners: Array<(status: SyncStatus) => void> = []

  constructor() {
    // Set up online/offline listeners
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnlineStatusChange.bind(this))
      window.addEventListener("offline", this.handleOnlineStatusChange.bind(this))
    }
  }

  // Handle online/offline status changes
  private handleOnlineStatusChange() {
    this.isOnline = navigator.onLine

    // Notify listeners of status change
    this.notifyListeners({
      online: this.isOnline,
      syncing: false,
    })
  }

  // Add a sync status listener
  addSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners.push(listener)
    // Immediately notify with current status
    listener({
      online: this.isOnline,
      syncing: false,
    })
  }

  // Remove a sync status listener
  removeSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners = this.syncListeners.filter((l) => l !== listener)
  }

  // Notify all listeners
  private notifyListeners(status: SyncStatus) {
    this.syncListeners.forEach((listener) => listener(status))
  }
}

// Create a singleton instance
export const syncManager = new SyncManager()
