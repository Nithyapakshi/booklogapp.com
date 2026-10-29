const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs')
const page = fs.readFileSync('app/home/page.tsx','utf8'), css = fs.readFileSync('app/home/home.module.css','utf8')
test('approved editorial copy and only account and privacy links remain', () => {
 for(const copy of ['Remember more of what you read.','A bookshelf worth sharing.','Find a book that fits your mood.','Start your reading log for free']) assert.ok(page.includes(copy))
 for(const forbidden of ['Your reading log, in one place.','Handpicked by you.','Ideas for your next read.','WhatsApp','Queued','<button']) assert.equal(page.includes(forbidden),false,forbidden)
 assert.deepEqual([...page.matchAll(/href="([^"]+)"/g)].map(x=>x[1]),['/login','/signup','/signup','/privacy'])
 assert.equal((page.match(/<h1 /g)||[]).length,1)
})
test('homepage has scoped dark styling, sticky signup header, and narrow layouts', () => {
 assert.ok(css.includes(':global(.dark) .home'))
 assert.match(css,/\.header\{position:sticky;top:0;z-index:30/)
 assert.ok(css.includes('@media(max-width:700px)'))
 assert.ok(css.includes('@media(max-width:360px)'))
 assert.ok(css.includes(':focus-visible'))
 assert.ok(css.includes('min-height:44px'))
 assert.equal(page.includes('localStorage'),false)
})

test('each tile uses distinct original decorative sample covers', () => {
 const sources = [...page.matchAll(/src="(\/home-covers\/[^"]+)"/g)].map(x=>x[1])
 assert.equal(sources.length,6)
 assert.equal(new Set(sources).size,6)
 for(const src of sources) { const svg=fs.readFileSync('public'+src,'utf8');assert.ok(svg.startsWith('<svg'));assert.doesNotMatch(svg, /<script|(?:href|src)=["']https?:|<foreignObject/) }
})
