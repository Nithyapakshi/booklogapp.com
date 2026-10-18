// Rules about how a change is made: one lockfile, migrations need a stated prod status, rule files need his approval.
import { changedFiles, fail, baseRef, showAt, newVersion } from "./lib.mjs"
import { existsSync } from "node:fs"

const body = process.env.PR_BODY // set in CI only; the local hook cannot see the PR description
const files = changedFiles()

// Lockfile consistency: pnpm only.
if (existsSync("package-lock.json")) fail("one package manager (pnpm)", "package-lock.json exists next to pnpm-lock.yaml", "Delete package-lock.json. pnpm-lock.yaml is the only lockfile.")
if (files.includes("package.json")) {
  const deps = (t) => { try { const j = JSON.parse(t || "{}"); return JSON.stringify([j.dependencies, j.devDependencies, j.optionalDependencies, j.pnpm]) } catch { return "" } }
  if (deps(showAt(baseRef(), "package.json")) !== deps(newVersion("package.json")) && !files.includes("pnpm-lock.yaml"))
    fail("lockfile matches package.json", "package.json dependencies changed but pnpm-lock.yaml did not", "Run pnpm install and commit pnpm-lock.yaml.")
}

if (body !== undefined) {
  // Migrations: the PR must state the prod status so a migration never reaches prod by accident.
  if (files.some(f => /^(supabase\/)?migrations\/.+\.sql$/.test(f)) && !/^Prod migration:\s*(not run yet|approved by Pakshiraj)/im.test(body))
    fail("no prod database change without his OK", "this PR adds or changes a migration but its description has no 'Prod migration:' line", "Add a line to the PR description: 'Prod migration: not run yet' or 'Prod migration: approved by Pakshiraj on <date>'. The migration must run on prod BEFORE the code release.")
  // Rule files: changing the rules needs his explicit approval.
  const protectedFiles = files.filter(f => /^(scripts\/|checks\/|\.githooks\/|\.github\/)/.test(f))
  if (protectedFiles.length && !/^Rules change approved by Pakshiraj:\s*yes/im.test(body))
    fail("the rules themselves need his approval", `this PR changes rule files: ${protectedFiles.slice(0, 4).join(", ")}`, "Get Pakshiraj's OK, then add the line 'Rules change approved by Pakshiraj: yes' to the PR description.")
}
if (!process.exitCode) console.log("pr-rules: ok")
