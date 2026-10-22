const test = require("node:test"), assert = require("node:assert"), fs = require("fs")

const comp = fs.readFileSync("components/google-sign-in-button.tsx", "utf8")

test("Google sign-in button is dark-shipped behind NEXT_PUBLIC_GOOGLE_LOGIN", () => {
  assert.ok(comp.includes('process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "true"'), "env flag gate")
  assert.ok(/if \(!GOOGLE_LOGIN_ENABLED\) return null/.test(comp), "renders nothing when flag off")
})

test("Google sign-in uses Supabase OAuth and returns to the existing auth callback", () => {
  assert.ok(comp.includes('signInWithOAuth'), "OAuth call present")
  assert.ok(comp.includes('provider: "google"'), "google provider")
  assert.ok(comp.includes('/auth/callback'), "redirects to the existing callback page")
})

test("login page offers Continue with Google above the email form, password login untouched", () => {
  const s = fs.readFileSync("app/login/page.tsx", "utf8")
  assert.ok(s.includes('import { GoogleSignInButton } from "@/components/google-sign-in-button"'), "import present")
  const btn = s.indexOf("<GoogleSignInButton")
  const form = s.indexOf("<form onSubmit={handleLogin}>")
  assert.ok(btn !== -1 && form !== -1 && btn < form, "button sits above the form")
  assert.ok(s.includes("signInWithPassword"), "email/password login unchanged")
})

test("signup page offers Continue with Google above the form, email signup untouched", () => {
  const s = fs.readFileSync("app/signup/page.tsx", "utf8")
  assert.ok(s.includes('import { GoogleSignInButton } from "@/components/google-sign-in-button"'), "import present")
  const btn = s.indexOf("<GoogleSignInButton")
  const form = s.indexOf("<form onSubmit={handleSubmit}>")
  assert.ok(btn !== -1 && form !== -1 && btn < form, "button sits above the form")
  assert.ok(s.includes("signUp(email, password, { first_name: firstName, last_name: lastName })"), "email signup unchanged")
})

test("auth callback already exchanges the OAuth code - no callback change needed", () => {
  const s = fs.readFileSync("app/auth/callback/page.tsx", "utf8")
  assert.ok(s.includes("exchangeCodeForSession(code)"), "PKCE exchange present")
})
