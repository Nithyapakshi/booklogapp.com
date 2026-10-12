const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const read = p => fs.readFileSync(p, 'utf8')
const css = read('app/globals.css')
test('light aliases retain every original colour and dark aliases cover each one', () => {
 const light = css.match(/:root \{([\s\S]*?)\n  \}/)[1]
 const dark = css.match(/\.dark \{([\s\S]*?)\n  \}/)[1]
 for (const [,key,value] of light.matchAll(/--bl-([a-f0-9]+): (#\w+);/g)) {
  assert.equal(value, '#'+key)
  assert.match(dark, new RegExp('--bl-'+key+': #'))
 }
 assert.match(dark, /--bl-faf7f2: #29231e/)
 assert.match(dark, /--bl-primary-ink: #23190d/)
})
test('provider uses class, system default and isolated browser storage', () => {
 const s = read('app/layout.tsx')
 assert.match(s,/suppressHydrationWarning/)
 assert.match(s,/attribute="class" defaultTheme="system" enableSystem storageKey="booklog-theme"/)
 assert.ok(s.indexOf('<ThemeProvider') < s.indexOf('<AuthProvider'))
})
test('theme selector has no server writes and avoids hydration-dependent selection', () => {
 const s=read('components/theme-preference.tsx')
 assert.match(s,/\["light", "dark", "system"\]/)
 assert.match(s,/aria-pressed=\{mounted && theme === value\}/)
 assert.match(s,/type="button" disabled=\{!mounted\}/)
 assert.match(s,/setTheme\(value\)/)
 assert.doesNotMatch(s,/supabase|fetch\(|\.update\(|\.insert\(/)
})
test('appearance is in Settings, not another main-screen control', () => {
 assert.match(read('app/settings/page.tsx'),/<ThemePreference \/>/)
 assert.doesNotMatch(read('app/books/page.tsx'),/ThemePreference|setTheme/)
})
test('shared dropdown and book dialogs use themed surfaces rather than white', () => {
 for(const p of ['components/book-details-dialog.tsx','components/book-card.tsx','components/book-search.tsx','components/ui/dropdown-menu.tsx']) {
  assert.doesNotMatch(read(p),/bg-white|hover:bg-gray-100/)
 }
})
test('contrast stays readable for the core dark-mode pairs', () => {
 const luminance = hex => { const a=hex.match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return a[0]*.2126+a[1]*.7152+a[2]*.0722 }
 for(const [fg,bg] of [['f4ebde','29231e'],['c4b6a4','382f27'],['dfa05d','29231e'],['23190d','dfa05d']]) {
  const a=luminance(fg),b=luminance(bg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+' on '+bg)
 }
})
