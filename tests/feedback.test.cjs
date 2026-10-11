const test = require("node:test")
const assert = require("node:assert")
const fs = require("fs")
const read = (p) => fs.readFileSync(p, "utf8")

test("feedback action validates, rate limits, inserts, then emails best effort", () => {
  const s = read("app/actions/feedback.ts")
  assert.match(s, /MAX_PER_HOUR = 5/)
  assert.match(s, /from\("feedback"\)\s*\.insert|\.from\("feedback"\)\.insert/)
  assert.ok(s.indexOf('.insert({') < s.indexOf("api.resend.com"), "insert before email")
  assert.match(s, /reply_to/)
  assert.match(s, /process\.env\.RESEND_API_KEY/)
})
test("feedback table is owner-scoped with RLS", () => {
  const m = read("migrations/20261011_feedback.sql")
  assert.match(m, /enable row level security/)
  assert.match(m, /user_id = auth\.uid\(\)/)
  assert.doesNotMatch(m, /grant[^;]*\b(update|delete)\b/i)
})
test("sidebar footer links to feedback next to settings, in both sidebars", () => {
  for (const f of ["components/sidebar.tsx", "app/settings/page.tsx"]) {
    const s = read(f)
    assert.match(s, /href="\/feedback"/)
    assert.ok(s.indexOf("Settings") < s.indexOf('href="/feedback"'))
  }
})
test("feedback page has message and reply-to, no kind chips", () => {
  const s = read("app/feedback/page.tsx")
  for (const t of ["Your message", "Reply to", "Send feedback"]) assert.ok(s.includes(t), t)
  assert.ok(!/star/i.test(s), "no star rating")
  for (const t of ["Something is broken", "Just saying thanks", "What kind of feedback"]) assert.ok(!s.includes(t), t)
  assert.doesNotMatch(read("app/actions/feedback.ts"), /KIND_LABEL/)
})
