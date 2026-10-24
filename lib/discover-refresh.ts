import type { Candidate } from "@/lib/discover-rows"

// Preserve only failed row sets, not successful empty responses. Never retain keys
// outside today's specs. assembleRows still removes owned/dismissed/duplicate books.
export function mergeRefreshCandidates(
  keys: string[], previous: Record<string, Candidate[]>, incoming: Record<string, Candidate[]>, failed: string[],
): Record<string, Candidate[]> {
  const keep = new Set(failed)
  return Object.fromEntries(keys.map(key => [key, keep.has(key) ? (previous[key] || []) : (incoming[key] || [])]))
}

export function refreshStatus(loading: boolean, slow: boolean, failed: boolean) {
  if (loading) return slow ? "slow" : "loading"
  return failed ? "failed" : "ready"
}
