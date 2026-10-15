// Pure validation shared by the server action and tests. Cache contains catalog data only.
export const SPIRIT_VERSION = 'spirit-v2'
export const normalize = (s: string) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
export const cacheKey = (title: string, author: string) => `${SPIRIT_VERSION}|claude-haiku-4-5-20251001|${normalize(title)}|${normalize(author)}`
const STOP = new Set('the a an and or of in to with on for this that is are it its as by from novel story book fiction literary dark life world people character characters'.split(' '))
export function sharedEvidence(seedDescription: string, candidateDescription: string, themes: unknown): boolean {
  if (!Array.isArray(themes) || themes.length < 2 || themes.length > 6) return false
  const seed = new Set(normalize(seedDescription).split(' ')), candidate = new Set(normalize(candidateDescription).split(' '))
  // Require at least two distinct, specific theme words in BOTH catalog descriptions.
  // This rejects genre-only/popularity claims and uncorroborated model explanations.
  const verified = new Set<string>()
  for (const theme of themes) {
    if (typeof theme !== 'string' || theme.length > 100) return false
    for (const word of normalize(theme).split(' ')) if (word.length >= 5 && !STOP.has(word) && seed.has(word) && candidate.has(word)) verified.add(word)
  }
  return verified.size >= 2
}
export function parseGroups(raw: string): any[] {
  const value = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] || raw)
  if (!Array.isArray(value) || value.length > 2) throw new Error('Invalid same-spirit response')
  return value
}
