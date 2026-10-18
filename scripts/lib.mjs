// Shared helpers for the BookLog rule checks. No dependencies on purpose (a new dependency would itself trip the no-spend rule).
import { execFileSync } from "node:child_process"

export const base = process.env.CHECK_BASE || "" // e.g. origin/main in CI. Empty means "staged changes" (local pre-commit).
const git = (...args) => { try { return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }) } catch { return "" } }

export const changedFiles = () => (base ? git("diff", "--name-only", "--diff-filter=ACMRD", `${base}...HEAD`) : git("diff", "--cached", "--name-only", "--diff-filter=ACMRD")).split("\n").filter(Boolean)
export const diffFor = (file) => (base ? git("diff", "-U0", `${base}...HEAD`, "--", file) : git("diff", "--cached", "-U0", "--", file))
export const addedLines = (file) => diffFor(file).split("\n").filter(l => l.startsWith("+") && !l.startsWith("+++")).map(l => l.slice(1))
// Allow-lists are always read from the BASE branch (or HEAD locally), never from the change under review,
// so a change cannot approve itself by editing its own allow-list.
export const trusted = (path) => { const ref = base || "HEAD"; const out = git("show", `${ref}:${path}`); try { return out ? JSON.parse(out) : null } catch { return null } }
export const showAt = (ref, path) => git("show", `${ref}:${path}`)
export const baseRef = () => base || "HEAD"
export const newVersion = (path) => (base ? git("show", `HEAD:${path}`) : git("show", `:${path}`))

export function fail(rule, what, fix) {
  console.error(`\nRULE BROKEN: ${rule}\n  What: ${what}\n  Fix:  ${fix}\n`)
  process.exitCode = 1
}
