const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const read=p=>fs.readFileSync(p,'utf8');
test('book Share button keeps the close-button lane; disclosure lives in the Share popup',()=>{const s=read('components/book-share-controls.tsx');assert.ok(s.includes('justify-end pr-11'));assert.ok(s.includes('<ShareButton onClick={openShare}/>'));assert.ok(s.includes('Anyone with the link sees your name and this book. Your private notes and rating are never shared.'))});
test('Share button is a labelled 40px control with a visible focus ring',()=>{const s=read('components/share-button.tsx');assert.ok(s.includes('height: 40'));assert.ok(s.includes('focus-visible:ring-2'));assert.ok(s.includes('{label}'))});
test('book dialog focuses the dialog on open, preserving keyboard-accessible share buttons',()=>{const s=read('components/book-details-dialog.tsx');assert.ok(s.includes('onOpenAutoFocus'));assert.ok(s.includes('event.preventDefault()'));assert.ok(s.includes('tabIndex={-1}'));assert.ok(s.includes('closeButtonClassName="inline-flex h-11 w-11'))});
test('quiet share buttons center their icon and retain44px touch height and focus-visible ring',()=>{const s=read('components/share-controls.tsx');assert.ok(s.includes('width:44,height:44'));assert.ok(s.includes('inline-flex items-center justify-center'));assert.ok(s.includes('focus-visible:ring-2'));assert.ok(s.includes('whiteSpace:"nowrap"'));assert.ok(s.includes('flexBasis:"100%"'))});
test('share popup never grows wider than the screen or its own frame',()=>{const s=read('components/book-share-controls.tsx');assert.ok(s.includes('grid-cols-[minmax(0,1fr)]'),'grid track must be allowed to shrink so long titles truncate');assert.ok(s.includes('w-[calc(100vw-24px)]'));assert.ok(s.includes('sm:max-w-[440px]'));assert.ok(s.includes('className="min-w-0 text-[12.5px]'))});
test('share popup without a display name asks for it in place and never shows a stuck "Preparing"',()=>{const s=read('components/book-share-controls.tsx');assert.ok(s.includes('<DisplayNameField onSaved'));assert.ok(s.includes('ready||error?"Copy link":"Preparing..."'));const f=read('components/display-name-field.tsx');assert.ok(f.includes('.from("profiles").update({ name: value })'));assert.ok(!/email/i.test(f.replace('Never uses or shows the email address','')))});

test('collection Share popup keeps its book list usable on phones', () => {
  const s = require('fs').readFileSync('components/collection-share-popup.tsx', 'utf8')
  // Hidden checkboxes must sit inside their row, or ticking scrolls the whole popup away.
  assert.equal((s.match(/className="relative flex cursor-pointer items-center gap-3 border-b py-2\.5"/g) || []).length, 3)
  assert.ok(s.includes('min-h-[200px] flex-1 overflow-y-auto'), 'book list keeps room to scroll')
  assert.ok(s.includes('overflow-y-auto rounded-lg p-5'), 'popup can scroll rather than cut off its buttons')
})

test('My Books header keeps the Share button inside the page on phones', () => {
  const p = require('fs').readFileSync('app/books/page.tsx', 'utf8')
  assert.ok(p.includes('className="min-w-0 text-xl font-bold sm:text-2xl"'))
  assert.ok(p.includes('justify-between gap-3 mb-6'))
})

test('cover fix migration upgrades http covers and only replaces the two functions', () => {
  const m = require('fs').readFileSync('supabase/migrations/20261126c_collection_share_covers.sql', 'utf8').toLowerCase()
  assert.equal((m.match(/create or replace function/g) || []).length, 2)
  assert.ok(!/\b(drop|alter|grant|revoke|delete|update|insert into public\.collection_shares\b(?![\s\S]*returning))/.test(m.replace(/--.*$/gm, '').replace(/insert into public\.collection_share(s|_items)[^;]*;/g, '')))
  assert.ok(m.includes("'https://' || substr(b.cover_url, 8)"))
})
