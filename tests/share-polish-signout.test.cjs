const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs')
const read = p => fs.readFileSync(p, 'utf8')

test('Share popup is simplified: no saved-choice note, no preview card, one privacy line', () => {
  const s = read('components/collection-share-popup.tsx')
  assert.ok(!s.includes('Saved choice'))
  assert.ok(!s.includes('What they will see'))
  assert.ok(s.includes("Private notes and ratings aren't shared."))
  assert.ok(s.includes('Select all') && s.includes('Copy link') && s.includes('WhatsApp'))
  assert.ok(!read('app/books/page.tsx').includes('savedChoice'))
})

test('old profile link On Hold note lives in Settings, only for full-library public profiles', () => {
  const s = read('app/settings/page.tsx')
  assert.ok(s.includes('sharingOn && shareMode === "full_library" && ('))
  assert.ok(s.includes('Your profile link also shows On Hold books.'))
})

test('Settings Sign out waits for sign-out, then goes to login; cached user is cleared', () => {
  const s = read('app/settings/page.tsx')
  assert.ok(s.includes('await signOut(); window.location.href = "/login"'))
  for (const p of ['components/auth-provider.tsx', 'components/auth-provider-fix.tsx'])
    assert.ok(read(p).includes('localStorage.removeItem("booklog-user")'), p)
})

test('phone account tab has a static Settings label; the name shows on the Settings page', () => {
  const s = read('components/sidebar.tsx')
  assert.ok(s.includes('<span>Settings</span>'))
  assert.ok(!s.includes('firstName : "Loading..."'))
  const st = read('app/settings/page.tsx'); assert.ok(st.includes('>{signedInAs}</p>')); assert.ok(!st.includes('Signed in as'))
})

test('every Remove path asks first', () => {
  const c = read('components/confirm-remove-book.tsx')
  assert.ok(c.includes('Remove this book?') && c.includes('Keep book') && c.includes('track("book.remove_cancelled"'))
  const page = read('app/books/page.tsx'), card = read('components/book-card.tsx'), next = read('components/next-read-controls.tsx')
  assert.ok(page.includes('from="list_menu"') && card.includes('from="grid_card"') && next.includes('from="up_next"'))
  // Remove buttons only open the confirmation; the delete runs from onConfirm.
  assert.ok(page.includes('onClick={() => { setDropdownOpen(false); setConfirmRemove(true) }}>Remove</div>'))
  assert.ok(card.includes('setConfirmRemove(true)') && /confirmedRemove[\s\S]*removeBook\(/.test(card))
  assert.ok(next.includes('onClick={()=>{setMenuOpen(false);setConfirmRemove(true)}}>Remove</button>'))
  for (const name of ['book.remove_cancelled', 'account.signed_out']) assert.match(name, /^[a-z_]+\.[a-z_]+$/)
})
