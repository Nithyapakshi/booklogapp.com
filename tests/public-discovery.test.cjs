const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs')
const read = path => fs.readFileSync(path, 'utf8')

test('public home is server-rendered without the auth loading gate', () => {
  const s = read('app/home/page.tsx')
  for (const forbidden of ['"use client"','useEffect','useRouter','getUser','setLoading','Loading...']) assert.equal(s.includes(forbidden), false, forbidden)
  assert.ok(s.includes('Keep. Share.'))
  assert.ok(s.includes('A place for your reading list, your thoughts on every book, and ideas for what to read next.'))
  assert.ok(read('lib/public-discovery.ts').includes('BookLog is a free web app to track the books you read, keep ratings and notes, share recommendations, and get picks based on your library and mood.'))
  for (const href of ['/login','/signup','/privacy']) assert.ok(s.includes(`href="${href}"`))
})

test('home metadata and JSON-LD describe only the real web app, no invented endorsements', () => {
  const s = read('app/home/page.tsx')
  assert.ok(s.includes('alternates: { canonical: `${PUBLIC_ORIGIN}/home` }'))
  assert.ok(s.includes('application/ld+json'))
  assert.ok(s.includes('"SoftwareApplication"'))
  assert.ok(s.includes('operatingSystem: "Web"'))
  for (const forbidden of ['aggregateRating','reviewCount','ratingValue','NYT','iOS','Android']) assert.equal(s.includes(forbidden), false)
  assert.ok(s.includes('JSON.stringify(application).replace(/</g, "\\\\u003c")'))
})

test('only the public homepage and privacy notice enter the sitemap', () => {
  const s = read('lib/public-discovery.ts')
  assert.ok(s.includes('PUBLIC_DISCOVERY_PATHS = ["/home", "/privacy"]'))
  assert.ok(read('app/sitemap.ts').includes('PUBLIC_DISCOVERY_PATHS.map'))
  assert.ok(read('app/privacy/page.tsx').includes('canonical: `${PUBLIC_ORIGIN}/privacy`'))
})

test('crawler policy excludes every existing non-public directory, assets remain available', () => {
  const s = read('app/robots.ts')
  assert.ok(s.includes('userAgent: "*"'))
  assert.ok(s.includes('sitemap: `${PUBLIC_ORIGIN}/sitemap.xml`'))
  for (const item of fs.readdirSync('app', {withFileTypes: true})) {
    if (!item.isDirectory() || ['home','privacy','learn-more'].includes(item.name)) continue
    const path = ['s','u'].includes(item.name) ? `/${item.name}/` : `/${item.name}`
    assert.ok(s.includes(JSON.stringify(path)), `${path} excluded`)
  }
  assert.equal(s.includes('"/_next"'), false)
  assert.equal(s.includes('"/s"'), false, 'do not collide with /sitemap.xml or /signup')
})

test('root and legacy learn-more permanently converge on the canonical home without loops', () => {
  assert.ok(read('app/learn-more/page.tsx').includes('permanentRedirect("/home")'))
  assert.ok(read('app/page.tsx').includes('permanentRedirect("/home")'))
  assert.ok(read('app/page.tsx').includes('import { permanentRedirect } from "next/navigation"'))
  assert.equal(read('app/page.tsx').includes('getUser'), false)
  assert.equal(read('app/home/page.tsx').includes('redirect('), false)
})
