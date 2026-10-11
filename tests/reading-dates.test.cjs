const test = require("node:test")
const assert = require("node:assert")
const fs = require("fs")
const ts = require("typescript")
const src = fs.readFileSync("lib/reading-dates.ts", "utf8")
const mod = { exports: {} }
new Function("module", "exports", ts.transpileModule(src, { compilerOptions: { module: "commonjs" } }).outputText)(mod, mod.exports)
const { todayLocal, isValidDate, readingDatesLabel } = mod.exports

test("today is the reader's local calendar day", () => {
  assert.strictEqual(todayLocal(new Date(2026, 9, 11, 23, 59)), "2026-10-11")
  assert.strictEqual(todayLocal(new Date(2026, 0, 5, 0, 1)), "2026-01-05")
})
test("date validation", () => {
  assert.ok(isValidDate("2026-02-28")); assert.ok(!isValidDate("2026-02-30")); assert.ok(!isValidDate("")); assert.ok(!isValidDate(null)); assert.ok(!isValidDate("10/11/2026"))
})
test("label shows what is known and nothing else", () => {
  assert.strictEqual(readingDatesLabel("2026-10-03", "2026-10-10"), "Started 3 Oct 2026 · Finished 10 Oct 2026")
  assert.strictEqual(readingDatesLabel("2026-10-03", null), "Started 3 Oct 2026")
  assert.strictEqual(readingDatesLabel(undefined, "2026-10-10"), "Finished 10 Oct 2026")
  assert.strictEqual(readingDatesLabel(undefined, undefined), "")
  assert.strictEqual(readingDatesLabel("garbage", "2026-13-01"), "")
})
test("moves never invent a finish date and fall back if date columns are missing", () => {
  const c = fs.readFileSync("lib/book-context.tsx", "utf8")
  assert.match(c, /status === "reading" && !existingBook!\.startedAt \? todayLocal\(\)/)
  assert.doesNotMatch(c, /finished_at: todayLocal/)
  assert.match(c, /if \(error && startedAt\) \(\{ data, error \} = await moveUpdate\(false\)\)/)
  assert.match(c, /FinishBookDialog/)
  const d = fs.readFileSync("components/finish-book-dialog.tsx", "utf8")
  assert.match(d, /Skip/)
})
