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
  assert.ok(s.includes("/auth/callback"), "callback URL present")
  assert.ok(/emailRedirectTo/.test(s), "emailRedirectTo passed to signUp")
})

test("auth callback page exchanges the code and lands signed-in users on the library", () => {
  const s = fs.readFileSync("app/auth/callback/page.tsx", "utf8")
  assert.ok(s.includes("exchangeCodeForSession"), "PKCE code exchange")
  assert.ok(s.includes('router.replace("/books")'), "signed-in users land on /books")
  assert.ok(s.includes('router.replace("/login")'), "sessionless visitors fall back to /login")
})

test("empty library prompts for the first book and focuses search; empty tab keeps plain message", () => {
  const s = fs.readFileSync("app/books/page.tsx", "utf8")
  assert.ok(s.includes("Add your first book"), "first-book CTA")
  assert.ok(s.includes("libraryEmpty"), "only when the whole library is empty")
  assert.ok(s.includes("No books here yet."), "plain per-tab message retained")
  assert.ok(s.includes('input[placeholder="Search books or authors"]'), "CTA focuses the search box")
})
