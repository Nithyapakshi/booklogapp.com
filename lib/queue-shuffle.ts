// Queue shuffle: surfaces one queued book at a time so older queued books get seen again.
// Pure logic only (no React, no database), so it is fully unit-tested.

export const SHUFFLE_MIN_QUEUED = 3

// The card shows only with a real choice to make and no next read chosen yet.
export function shouldShowShuffle(queuedCount: number, hasNextRead: boolean): boolean {
  return queuedCount >= SHUFFLE_MIN_QUEUED && !hasNextRead
}

export type ShuffleState = { current: string | null; seen: string[] }

// Picks the next book to show. No repeats until every queued book has been shown,
// then a fresh round starts (never repeating the book on screen straight away).
// Books removed from the queue are forgotten; books added join the current round.
export function pickNext(ids: string[], state: ShuffleState, rand: () => number = Math.random): ShuffleState {
  if (!ids.length) return { current: null, seen: [] }
  const live = new Set(ids)
  let seen = state.seen.filter(id => live.has(id))
  let pool = ids.filter(id => !seen.includes(id))
  if (!pool.length) {
    seen = state.current && live.has(state.current) ? [state.current] : []
    pool = ids.filter(id => !seen.includes(id))
    if (!pool.length) pool = ids
  }
  const current = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
  return { current, seen: [...seen, current] }
}
