export function nextReadBook<T extends { id: string }>(queued: T[], id: string | null): T | null {
  return id ? queued.find(book => book.id === id) ?? null : null
}
export function otherQueued<T extends { id: string }>(queued: T[], pinned: T | null): T[] {
  return pinned ? queued.filter(book => book.id !== pinned.id) : queued
}
