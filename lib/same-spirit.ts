// Pure validation shared by the server action and tests. Cache contains catalog data only.
export const SPIRIT_VERSION = 'spirit-v3'
export const normalize = (s: string) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
export const cacheKey = (title: string, author: string) => `${SPIRIT_VERSION}|claude-haiku-4-5-20251001|${normalize(title)}|${normalize(author)}`
// A closed thematic vocabulary fails closed on unfamiliar concepts. Pronouns, prose,
// genre, places, schools, titles and names cannot become evidence by mere overlap.
// Aliases support ordinary wording differences, not model-generated semantic guesses.
const CONCEPTS: Record<string, string[]> = {
  grief: ['grief', 'grieving', 'bereavement', 'mourning'],
  isolation: ['isolation', 'isolated', 'loneliness', 'lonely', 'alienation', 'alienated'],
  addiction: ['addiction', 'addicted', 'alcoholism', 'alcoholic'],
  trauma: ['trauma', 'traumatic', 'traumatized'],
  abuse: ['abuse', 'abused', 'abusive', 'mistreatment'],
  betrayal: ['betrayal', 'betrayed', 'betrays', 'treachery'],
  guilt: ['guilt', 'guilty', 'remorse'],
  obsession: ['obsession', 'obsessed', 'obsessive'],
  identity: ['identity', 'identities', 'selfhood'],
  memory: ['memory', 'memories', 'remembering', 'forgetting'],
  mortality: ['mortality', 'death', 'dying'],
  oppression: ['oppression', 'oppressed', 'oppressive', 'tyranny'],
  discrimination: ['discrimination', 'racism', 'racist', 'prejudice'],
  displacement: ['displacement', 'displaced', 'exile', 'exiled', 'refugee', 'refugees'],
  ambition: ['ambition', 'ambitious'],
  deception: ['deception', 'deceit', 'deceitful', 'secrecy', 'secret', 'secrets'],
  revenge: ['revenge', 'vengeance', 'vengeful'],
  sacrifice: ['sacrifice', 'sacrifices', 'sacrificing'],
  redemption: ['redemption', 'redeemed', 'atonement'],
  poverty: ['poverty', 'impoverished', 'destitution', 'destitute'],
  inequality: ['inequality', 'inequalities', 'injustice'],
  belonging: ['belonging', 'estrangement', 'estranged'],
  faith: ['faith', 'religion', 'religious', 'spirituality'],
  friendship: ['friendship', 'friendships'],
  loyalty: ['loyalty', 'loyal', 'disloyalty'],
}
export function sharedEvidence(seedDescription: string, candidateDescription: string, themes: unknown, identities: string[] = []): boolean {
  if (!Array.isArray(themes) || themes.length < 2 || themes.length > 6) return false
  // A thematic word used in a title/author is not independent description evidence.
  const names = new Set(identities.flatMap(s => normalize(s).split(' ')))
  const words = (s: string) => new Set(normalize(s).split(' ').filter(w => !names.has(w)))
  const seed = words(seedDescription), candidate = words(candidateDescription)
  const verified = new Set<string>()
  for (const theme of themes) {
    if (typeof theme !== 'string' || theme.length > 100) return false
    const claim = words(theme)
    for (const [concept, aliases] of Object.entries(CONCEPTS)) {
      if (aliases.some(w => claim.has(w)) && aliases.some(w => seed.has(w)) && aliases.some(w => candidate.has(w))) verified.add(concept)
    }
  }
  // Synonyms count once; two labels for loneliness cannot satisfy the threshold.
  return verified.size >= 2
}
export function parseGroups(raw: string): any[] {
  const value = JSON.parse(raw.match(/\[[\s\S]*\]/)?.[0] || raw)
  if (!Array.isArray(value) || value.length > 2) throw new Error('Invalid same-spirit response')
  return value
}
