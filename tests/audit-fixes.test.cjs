const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');
const read=p=>fs.readFileSync(p,'utf8');
test('legacy demo detail redirects instead of displaying fake book data',()=>{const s=read('app/books/[id]/page.tsx');assert.match(s,/redirect\("\/books"\)/);assert.doesNotMatch(s,/bookDetails|useState/)});
test('legacy profile redirects to persistent settings',()=>{const s=read('app/profile/page.tsx');assert.match(s,/redirect\("\/settings"\)/);assert.doesNotMatch(s,/example.com|useState/)});
test('settings sections have distinct navigation destinations',()=>{const s=read('app/settings/page.tsx');assert.match(s,/\/books\?section=recommended/);assert.match(s,/\/books\?section=discover/)});
test('section selection permits only implemented sections',()=>{const s=read('app/books/page.tsx');assert.match(s,/section === "discover" \|\| section === "recommended"/);assert.match(s,/setSidebarTab\(section\)/)});
test('signed out library shows login without mounting book UI',()=>{const s=read('app/books/page.tsx');assert.match(s,/if \(!user\)/);assert.match(s,/Log in to view your library/);assert.match(s,/return <BooksLibrary \/>/)});
for(const p of ['app/api/check-schema/route.ts','app/api/supabase-test/route.ts'])test(p+' is retired with no database access',()=>{const s=read(p);assert.match(s,/status: 404/);assert.doesNotMatch(s,/createClient|process.env/)});
