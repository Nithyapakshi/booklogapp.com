const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const read = p => fs.readFileSync(p, 'utf8')

test('thin or empty Google results fall back to Open Library, not only errors', () => {
  const s = read('app/actions/discover-rows.ts')
  assert.match(s, /const THIN = 8/)
  assert.match(s, /list\.length < THIN/)
  assert.match(s, /candidatesFrom\(s, pagesOL\)/)
})

test('rows are reported as each row set arrives', () => {
  const s = read('app/actions/discover-rows.ts')
  assert.match(s, /onSpec\?: \(key: string, list: Cand\[\]\) => void/)
  assert.match(read('app/books/page.tsx'), /fetchDiscoverCandidates\(specs\.filter\(s => s\.kind !== "rated"\), \(key, list\)/)
})

test('library rows stop waiting after 10 seconds and point at Ask AI', () => {
  const p = read('app/books/page.tsx')
  assert.match(p, /setRowsTimedOut\(true\) \}, 10000\)/)
  assert.match(p, /No library-based rows are ready to show\. Describe what you enjoy in the Ask AI box above/)
  assert.match(p, /\(!rowsLoading \|\| rowsTimedOut\) && specs\.length > 0/)
})

test('the generic empty text only shows when the library has no qualifying rows', () => {
  assert.match(read('app/books/page.tsx'), /!hasAnything && !rowsLoading && !isLoading && specs\.length === 0/)
})
