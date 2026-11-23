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

// Vertical placement: pull the real helper out of the component and run it.
const ts=require('typescript')
const src=c.slice(c.indexOf('const CARD_MENU_HEIGHT'),c.indexOf('export default function BookCard'))
const mod={exports:{}};new Function('module','exports',ts.transpileModule(src,{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText)(mod,mod.exports)
const {menuOpensUp}=mod.exports

test('card menu opens below when it fits, above only when it fits there, and sits right next to the button',()=>{
 const vh=900
 assert.equal(menuOpensUp({top:300,bottom:328},vh),false)   // plenty of room below: below, as today
 assert.equal(menuOpensUp({top:640,bottom:668},vh),true)    // Instinct's case: full menu would end 30px past the bottom, so it opens above
 assert.equal(menuOpensUp({top:600,bottom:628},vh),false)   // 628+4+250+8=890 fits: below, as today
 assert.equal(menuOpensUp({top:700,bottom:728},vh),true)    // near the bottom: opens above
 assert.equal(menuOpensUp({top:120,bottom:148},300),false)  // fits neither (tiny screen): stays below
 // Above: anchored by its bottom edge 4px over the button, so no gap and no overlap whatever its height.
 assert.match(c,/\{ bottom: `\$\{window\.innerHeight - buttonRef\.current\.getBoundingClientRect\(\)\.top \+ 4\}px` \}/)
 assert.match(c,/\{ top: `\$\{buttonRef\.current\.getBoundingClientRect\(\)\.bottom \+ 4\}px` \}/)
 assert.doesNotMatch(c,/top - 200/)
})

test('list-view menu: opens downward as before, upward only when the whole (taller) menu fits above',()=>{
 const p=fs.readFileSync('app/books/page.tsx','utf8')
 assert.match(p,/import BookCard, \{ menuOpensUp \} from "@\/components\/book-card"/)
 assert.match(p,/const LIST_MENU_HEIGHT = 330/)
 assert.match(p,/if \(!dropdownOpen && listMenuButtonRef\.current\) setMenuUp\(menuOpensUp\(listMenuButtonRef\.current\.getBoundingClientRect\(\), window\.innerHeight, LIST_MENU_HEIGHT\)\); setDropdownOpen\(!dropdownOpen\)/)
 assert.match(p,/className=\{`absolute right-0 \$\{menuUp \? "bottom-full mb-1" : "mt-1"\} w-44 bg-card rounded-md shadow-lg border border-border py-1 z-50`\}/)
 // Instinct's case: 500px window, button near the bottom (menu measured 390-672): now opens upward.
 assert.equal(menuOpensUp({top:362,bottom:386},500,330),true)
 assert.equal(menuOpensUp({top:300,bottom:324},900,330),false) // room below on a tall screen: downward, as today
 assert.equal(menuOpensUp({top:120,bottom:144},300,330),false) // fits neither: downward, as today
 // Grid callers are unchanged: the default height is still the card menu's.
 assert.equal(menuOpensUp({top:640,bottom:668},900),true)
})
