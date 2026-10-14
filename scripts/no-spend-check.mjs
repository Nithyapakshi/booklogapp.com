// Rule: nothing that can cost money is added without Pakshiraj's OK.
// A tripwire for the obvious routes (dependencies, paid-service names, key-like env vars, new external hosts, compute config).
// It cannot see spend caused by dashboard changes or by calling an already-approved paid service more often.
import { changedFiles, addedLines, trusted, baseRef, showAt, newVersion, fail } from "./lib.mjs"

const RULE = "no spending without Pakshiraj's OK"
const allowed = trusted("checks/allowed.json") || { dependencies: [], env: [], hosts: [], paidServices: {} }
const how = "If he approved it, add it to checks/allowed.json in its own PR that he merges first, then re-run this PR."
const files = changedFiles()

// 1. New dependencies
if (files.includes("package.json")) {
  const keys = (txt) => { try { const j = JSON.parse(txt || "{}"); return Object.keys({ ...j.dependencies, ...j.devDependencies, ...j.optionalDependencies }) } catch { return [] } }
  const before = new Set(keys(showAt(baseRef(), "package.json")))
  const added = keys(newVersion("package.json")).filter(k => !before.has(k) && !allowed.dependencies.includes(k))
  if (added.length) fail(RULE, `package.json adds new dependencies: ${added.join(", ")}`, `Remove them, or ask Pakshiraj first. ${how}`)
}

const PAID = /\b(openai|anthropic|stripe|twilio|sendgrid|mailgun|resend|postmark|mapbox|algolia|pinecone|cohere|replicate|elevenlabs|paypal|razorpay|braintree|firebase|@aws-sdk|@vercel\/(kv|postgres|blob|edge-config)|upstash|sentry|datadog|segment|posthog|mixpanel)\b/i
const sourceFile = (f) => f !== "package.json" && /\.(ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|toml)$/.test(f) && !/(^|\/)(node_modules|checks|scripts)\//.test(f) && !/lock(\.json|\.yaml)?$/.test(f) && !f.startsWith("tests/")

for (const f of files.filter(sourceFile)) {
  const lines = addedLines(f)
  // 2. Paid service names in newly added lines
  for (const l of lines) {
    const m = l.match(PAID)
    if (m && !(allowed.paidServices[f] || []).map(s => s.toLowerCase()).includes(m[1].toLowerCase()))
      fail(RULE, `${f} adds a reference to a paid service ("${m[1]}"): ${l.trim().slice(0, 100)}`, `Remove it, or ask Pakshiraj. ${how}`)
  }
  // 3. Key-like environment variables
  for (const l of lines) for (const m of l.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    if (/(KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/.test(m[1]) && !allowed.env.includes(m[1]))
      fail(RULE, `${f} reads a new credential variable ${m[1]}`, `A new key usually means a new service or account. Ask Pakshiraj. ${how}`)
  }
  // 4. New external hosts
  for (const l of lines) for (const m of l.matchAll(/https?:\/\/([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g)) {
    const host = m[1].toLowerCase()
    if (!allowed.hosts.some(h => host === h || host.endsWith("." + h)))
      fail(RULE, `${f} calls or links a new external host: ${host}`, `If this is a paid or metered API, ask Pakshiraj. ${how}`)
  }
}

// 5. Compute and billing config
for (const f of files) {
  if (f === "vercel.json") {
    const bad = addedLines(f).filter(l => /(cron|maxDuration|memory|regions|functions)/i.test(l))
    if (bad.length) fail(RULE, `vercel.json changes compute settings (${bad.map(b => b.trim()).join(" | ").slice(0, 150)})`, "Longer functions, crons and regions can raise the Vercel bill. Ask Pakshiraj first.")
  }
  if (/^\.github\/workflows\//.test(f) && addedLines(f).some(l => /^\s*(schedule|cron):/.test(l)))
    fail(RULE, `${f} adds a scheduled workflow (runs, and bills minutes, without anyone asking)`, "Remove the schedule or ask Pakshiraj.")
}
if (!process.exitCode) console.log("no-spend: ok")
