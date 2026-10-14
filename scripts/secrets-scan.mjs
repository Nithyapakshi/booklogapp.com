// Rule: no secrets in the repo. Scans the lines a change adds, plus file names that should never be committed.
import { changedFiles, addedLines, fail } from "./lib.mjs"

const RULE = "no secrets in the repo"
const PATTERNS = [
  ["JWT-style token (Supabase keys look like this)", /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["API key starting sk-", /\bsk-[A-Za-z0-9_-]{20,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["GitHub token", /\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
  ["Slack token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Database URL with a password", /\b(postgres(ql)?|mysql|mongodb(\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@/],
  ["Hard-coded secret assignment", /\b(password|passwd|secret|api[_-]?key|service[_-]?role)\b["']?\s*[:=]\s*["'][A-Za-z0-9_\-/+=]{16,}["']/i],
]
const fix = "Remove it from the change AND from git history, put it in the Vercel/Supabase environment settings, and rotate the key (treat it as leaked)."
for (const f of changedFiles()) {
  if (/(^|\/)\.env(\.|$)/.test(f) && !/\.env\.example$/.test(f)) { fail(RULE, `${f} is an environment file`, fix); continue }
  if (/\.(pem|p12|pfx|key)$/.test(f)) { fail(RULE, `${f} looks like a key file`, fix); continue }
  if (/lock(\.json|\.yaml)?$/.test(f) || /^checks\//.test(f) || f === "scripts/secrets-scan.mjs") continue
  addedLines(f).forEach(l => { for (const [name, re] of PATTERNS) if (re.test(l)) fail(RULE, `${f}: ${name} -> ${l.trim().slice(0, 40)}...`, fix) })
}
if (!process.exitCode) console.log("secrets: ok")
