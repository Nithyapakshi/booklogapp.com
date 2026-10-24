const test = require("node:test"), assert = require("node:assert"), fs = require("fs")

test("signup asks for one password field, not two", () => {
  const s = fs.readFileSync("app/signup/page.tsx", "utf8")
  assert.ok(!s.includes("confirm-password"), "no confirm-password input")
  assert.ok(!s.includes("confirmPassword"), "no confirmPassword state")
  assert.strictEqual((s.match(/type="password"/g) || []).length, 1, "exactly one password input")
})

test("signup name fields are optional, email and password stay required", () => {
  const s = fs.readFileSync("app/signup/page.tsx", "utf8")
  assert.ok(!/id="first-name"[^>]*required/.test(s), "first name not required")
  assert.ok(!/id="last-name"[^>]*required/.test(s), "last name not required")
  assert.ok(/id="email"[^>]*required/.test(s), "email still required")
  assert.ok(/id="password"[^>]*required/.test(s), "password still required")
})

test("signup confirmation message promises automatic sign-in", () => {
  const s = fs.readFileSync("app/signup/page.tsx", "utf8")
  assert.ok(s.includes("The link signs you in and takes you straight to your library"), "new confirm message")
  assert.ok(!s.includes("then log in"), "old 'then log in' wording gone")
})

test("signUp passes an auth callback redirect so the confirm link can sign the user in", () => {
  const s = fs.readFileSync("components/auth/auth-provider.tsx", "utf8")
  assert.ok(s.includes("callbackUrl()") && fs.readFileSync("lib/auth-return.ts","utf8").includes("/auth/callback"), "callback URL helper present")
  assert.ok(/emailRedirectTo/.test(s), "emailRedirectTo passed to signUp")
})

test("Supabase client auto-detects URL sessions - the callback flow depends on this", () => {
  const s = fs.readFileSync("lib/supabase/client.ts", "utf8")
  assert.ok(/detectSessionInUrl:\s*true/.test(s), "detectSessionInUrl stays on")
})

test("auth callback checks an existing session before exchanging, and re-checks after", () => {
  const s = fs.readFileSync("app/auth/callback/page.tsx", "utf8")
  const firstGetSession = s.indexOf("waitForSession(supabase, 2)")
  const manualExchange = s.indexOf("exchangeCodeForSession(code)")
  assert.ok(firstGetSession !== -1, "session checked first")
  assert.ok(manualExchange !== -1, "PKCE exchange present")
  assert.ok(firstGetSession < manualExchange, "session check happens before any manual exchange")
  const after = s.slice(manualExchange)
  assert.ok(after.includes("waitForSession(supabase, 2)"), "session re-checked after manual exchange before failing")
  assert.ok(after.includes(".catch(() => null)"), "a double-consumed code is not fatal")
  assert.ok(s.includes("router.replace(authReturnFromLocation())"), "signed-in users use validated return (default /books)")
  assert.ok(s.includes("router.replace(`/login?next="), "sessionless visitors fall back to login with validated return")
})

// Behavioral: run the real decision logic across every load state.
test("first-book prompt only shows for a loaded, error-free, truly empty library", () => {
  const src = fs.readFileSync("lib/library-empty.ts", "utf8")
  const js = src
    .replace("export function showFirstBookPrompt(state: { loading: boolean; loadError: boolean; bookCount: number }): boolean {",
             "function showFirstBookPrompt(state) {")
  assert.ok(js.includes("function showFirstBookPrompt(state) {"), "helper transform applied")
  const showFirstBookPrompt = new Function(js + "; return showFirstBookPrompt")()
  const cases = [
    [{ loading: true,  loadError: false, bookCount: 0 }, false, "still loading: never show"],
    [{ loading: true,  loadError: true,  bookCount: 0 }, false, "loading with error: never show"],
    [{ loading: false, loadError: true,  bookCount: 0 }, false, "load failed: never show"],
    [{ loading: false, loadError: false, bookCount: 0 }, true,  "loaded, empty: show"],
    [{ loading: false, loadError: false, bookCount: 3 }, false, "has books: never show"],
    [{ loading: false, loadError: true,  bookCount: 3 }, false, "error with stale books: never show"],
  ]
  for (const [state, expected, label] of cases) {
    assert.strictEqual(showFirstBookPrompt(state), expected, label)
  }
})

test("books page gates the prompt through the shared helper; empty tab keeps plain message", () => {
  const s = fs.readFileSync("app/books/page.tsx", "utf8")
  assert.ok(s.includes("showFirstBookPrompt({ loading, loadError,"), "page uses the gated helper")
  assert.ok(s.includes("Add your first book"), "first-book CTA")
  assert.ok(s.includes("No books here yet."), "plain per-tab message retained")
  assert.ok(s.includes('input[placeholder="Search books or authors"]'), "CTA focuses the search box")
})

test("empty shelf points to Discover", () => {
  const s = fs.readFileSync("app/books/page.tsx", "utf8")
  assert.ok(s.includes("Not sure what to read yet?"), "Discover line present")
  assert.ok(s.includes('href="/books?section=discover"'), "href deep-links the Discover section")
  assert.ok(s.includes('handleSidebarTab("discover")'), "click switches the sidebar tab in place")
  assert.ok(s.includes("ideas picked for you."), "his approved copy")
  assert.ok(!s.includes("no shelf needed"), "no 'no shelf needed' copy anywhere")
})
