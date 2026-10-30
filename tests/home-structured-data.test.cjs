const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs')
const read = path => fs.readFileSync(path, 'utf8')

const faqSrc = read('lib/home-faq.ts')
const sections = read('app/home/home-sections.tsx')
const page = read('app/home/page.tsx')

const entries = [...faqSrc.matchAll(/\{ question: "([^"]+)", answerParts: \[(.*?)\] \}/g)].map(m => ({
  question: m[1],
  parts: [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(p => p[1]),
}))

test('FAQPage data lists every visible FAQ question, in the same order', () => {
  const visible = [...sections.matchAll(/<span>\{"([^"]+)"\}<\/span>/g)].map(m => m[1])
  assert.equal(visible.length, 8)
  assert.deepEqual(entries.map(e => e.question), visible)
})

test('every FAQPage answer part appears verbatim in the visible FAQ', () => {
  for (const e of entries) {
    assert.ok(e.parts.length > 0, e.question)
    for (const part of e.parts) assert.ok(sections.includes(part.trim()), `${e.question}: ${part}`)
  }
})

test('home page emits FAQPage and SoftwareApplication JSON-LD safely, with no invented claims', () => {
  assert.ok(page.includes('"FAQPage"'))
  assert.ok(page.includes('JSON.stringify(faq).replace(/</g, "\\\\u003c")'))
  assert.ok(page.includes('price: "0"'))
  for (const forbidden of ['aggregateRating', 'reviewCount', 'ratingValue', 'review:', 'iOS', 'Android']) assert.equal(page.includes(forbidden), false, forbidden)
  assert.equal(sections.includes('application/ld+json'), false, 'structured data stays server-side in page.tsx')
})
