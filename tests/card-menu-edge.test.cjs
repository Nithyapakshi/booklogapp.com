const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs')
const c=fs.readFileSync('components/book-card.tsx','utf8')
// Same formula as the card, so the numbers below match what the reader sees.
const left=(buttonRight,viewport)=>Math.max(8,Math.min(buttonRight-160,viewport-168))

test('card menu stays on screen at the left edge, the right edge and in between',()=>{
 assert.match(c,/left: `\$\{Math\.max\(8, Math\.min\(buttonRef\.current\.getBoundingClientRect\(\)\.right - 160, window\.innerWidth - 168\)\)\}px`/)
 assert.equal(left(100,616),8)      // button near the left edge: was -60, now inside
 assert.equal(left(400,616),240)    // normal case unchanged: right-aligned to the button
 assert.equal(left(1400,1280),1112) // never past the right edge
 for(const vw of [360,390,616,768,1280])for(let r=0;r<=vw;r+=7){const l=left(r,vw);assert.ok(l>=8&&l+160<=vw-8||vw<176,`${r}@${vw}`)}
})

test('menu items and look are unchanged',()=>{
 for(const t of ['Edit details','Move to Reading','Move to Queued','Move to Completed','Move to Recommendations','Move to On Hold','Find on Amazon'])assert.ok(c.includes(t),t)
 assert.match(c,/className="fixed bg-card rounded-md shadow-lg border border-border py-1 z-\[9999\] w-40 book-dropdown-menu"/)
})
