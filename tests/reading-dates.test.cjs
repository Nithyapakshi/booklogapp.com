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
test("dates are asked only when they happen and never invented", () => {
  const c = fs.readFileSync("lib/book-context.tsx", "utf8")
  assert.doesNotMatch(c, /todayLocal\(\)/)
  assert.doesNotMatch(c, /finished_at: todayLocal/)
  // Finish prompt only when leaving Reading for Completed or Recommendations.
  assert.match(c, /status === "completed" && existingStatus === "reading"\) setFinishPrompt/)
  assert.match(c, /status === "recommended" && existingStatus === "reading"\) setFinishPrompt/)
  // Start prompt when a book lands in Reading, by move or by add.
  assert.strictEqual((c.match(/setStartPrompt\(\{/g) || []).length, 4)
  assert.match(c, /status === "reading"\) setStartPrompt/)
  assert.match(fs.readFileSync("components/start-book-dialog.tsx", "utf8"), /Skip/)
  assert.match(fs.readFileSync("components/finish-book-dialog.tsx", "utf8"), /Skip/)
})
test("adding a book straight to Completed asks for rating and finish month", () => {
  const c = fs.readFileSync("lib/book-context.tsx", "utf8")
  // Search/add-dialog insert path.
  assert.match(c, /else if \(status === "completed"\) setFinishPrompt\(\{ id: bookId, title: book\.title, rating: book\.selfRating \|\| 0, where: "Completed", direct: true \}\)/)
  // Add-manually saveDetails path.
  assert.match(c, /else if \(!edit && status === "completed"\) setFinishPrompt\(\{id: rows\[0\]\.id, title: rows\[0\]\.title, rating: rows\[0\]\.selfRating \|\| 0, where: "Completed", direct: true\}\)/)
})
test("recommended copy returns to Reading as one unit and keeps its dates", () => {
  const c = fs.readFileSync("lib/book-context.tsx", "utf8")
  assert.match(c, /status === "reading" && existingBook!\.autoCompleted/)
  const m = fs.readFileSync("supabase/migrations/20261011_membership_keeps_dates.sql", "utf8")
  assert.strictEqual((m.match(/,st,fi\)/g) || []).length, 4)
  assert.match(m, /select min\(started_at\),max\(finished_at\) into st,fi/)
})

test("all new date prompts default to month while saved exact days stay exact", () => {
 const {promptReadingDate} = mod.exports
 assert.deepStrictEqual(promptReadingDate(undefined, undefined, new Date(2026,9,25)), {value:"2026-10-01",precision:"month"})
 assert.deepStrictEqual(promptReadingDate("2026-02-14", "day"), {value:"2026-02-14",precision:"day"})
 assert.deepStrictEqual(promptReadingDate("2026-02-14"), {value:"2026-02-14",precision:"day"})
 assert.deepStrictEqual(promptReadingDate("2026-02-01", "month"), {value:"2026-02-01",precision:"month"})
 for (const name of ["start-book-dialog", "finish-book-dialog"]) {
  const s=fs.readFileSync(`components/${name}.tsx`,"utf8")
  assert.match(s,/MonthDayPicker/);assert.doesNotMatch(s,/type="date"/);assert.match(s,/promptReadingDate/)
 }
})
test("Reading edit includes both dates and context carries saved precision through prompts", () => {
 const e=fs.readFileSync("components/book-edit-form.tsx","utf8")
 assert.match(e,/const showFinish = \["reading", "completed", "recommended"\]/)
 const c=fs.readFileSync("lib/book-context.tsx","utf8")
 assert.doesNotMatch(c,/Precision === "month" \? undefined/)
 assert.match(c,/startedAt: existingBook!\.startedAt, startedPrecision: existingBook!\.startedPrecision/)
 assert.match(c,/finishedAt: existingBook!\.finishedAt, finishedPrecision: existingBook!\.finishedPrecision/)
 assert.match(c,/started_precision: precision/)
 assert.match(c,/onSave=\{\(date, precision\) => saveStart\(startPrompt.id, date, precision\)\}/)
})
