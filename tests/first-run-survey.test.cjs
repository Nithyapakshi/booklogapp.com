const test = require("node:test"), assert = require("node:assert"), fs = require("fs")
const { shouldShowSurvey, latestAnswers, orderGenresByMood, buildSurveySpecs, provenanceLine, SURVEY_GENRES, MAX_SURVEY_GENRES } = require("../lib/survey.ts")

// --- behaviour (pure logic) ---

test("survey shows only when there is no survey_events row at all", () => {
  assert.strictEqual(shouldShowSurvey([]), true)
  for (const t of ["completed", "skipped", "closed_x"]) assert.strictEqual(shouldShowSurvey([{ event_type: t }]), false, t)
})

test("latestAnswers takes the newest completed row with genres", () => {
  const events = [
    { event_type: "skipped" },
    { event_type: "completed", genres: ["Fantasy", "Romance"], mood: "A page-turner", favorite_author: null },
    { event_type: "completed", genres: ["History"], mood: "", favorite_author: "Saramago" },
  ]
  const a = latestAnswers(events)
  assert.deepStrictEqual(a.genres, ["Fantasy", "Romance"])
  assert.strictEqual(a.mood, "A page-turner")
  assert.strictEqual(latestAnswers([{ event_type: "skipped" }]), null)
  assert.strictEqual(latestAnswers([{ event_type: "completed", genres: [] }]), null)
})

test("mood picks which selected genre leads; unpicked order is kept", () => {
  assert.deepStrictEqual(orderGenresByMood(["Fantasy", "Mystery & Thriller", "History"], "A page-turner"), ["Mystery & Thriller", "Fantasy", "History"])
  assert.deepStrictEqual(orderGenresByMood(["Romance", "Fantasy"], "To escape"), ["Fantasy", "Romance"])
  assert.deepStrictEqual(orderGenresByMood(["Romance", "Fantasy"], ""), ["Romance", "Fantasy"])
})

test("survey specs map chips to Google Books subjects, one row per genre", () => {
  const specs = buildSurveySpecs({ genres: ["Fantasy", "Romance"], mood: "A page-turner", favoriteAuthor: "" })
  assert.strictEqual(specs.length, 2)
  assert.deepStrictEqual(specs.map(s => s.genre), ["romance", "fantasy"]) // "A page-turner" leads with Romance
  assert.deepStrictEqual(specs.map(s => s.title), ["Because you enjoy Romance", "Because you enjoy Fantasy"])
  assert.ok(specs.every(s => s.kind === "genre" && s.key.startsWith("survey:")))
  for (const g of SURVEY_GENRES) assert.ok(g.subject.length > 0, g.chip)
})

test("provenance line lists genres and mood", () => {
  assert.strictEqual(provenanceLine({ genres: ["Fantasy", "Romance"], mood: "A page-turner", favoriteAuthor: "" }), "Picked from your answers: Fantasy · Romance · A page-turner.")
  assert.strictEqual(provenanceLine({ genres: ["History"], mood: "", favoriteAuthor: "x" }), "Picked from your answers: History.")
})

// --- source pins ---

test("survey outcomes are the three agreed event types", () => {
  const c = fs.readFileSync("components/first-run-survey.tsx", "utf8")
  for (const t of ['"completed"', '"skipped"', '"closed_x"']) assert.ok(c.includes(t), t)
  const m = fs.readFileSync("supabase/migrations/20261021_survey_events.sql", "utf8")
  assert.ok(m.includes("check (event_type in ('completed', 'skipped', 'closed_x'))"), "migration constrains event_type")
  assert.ok(m.includes("enable row level security"), "migration enables RLS")
})

test("genre picks are capped", () => {
  const c = fs.readFileSync("components/first-run-survey.tsx", "utf8")
  assert.ok(c.includes("MAX_SURVEY_GENRES"), "cap constant used")
  assert.strictEqual(MAX_SURVEY_GENRES, 3)
})

test("survey pops over My Books only, never on the landing page", () => {
  const p = fs.readFileSync("app/books/page.tsx", "utf8")
  assert.ok(p.includes('sidebarTab === "my-books" && shouldShowSurvey(surveyEvents)'), "gated to the My Books tab")
  const landing = fs.readFileSync("app/page.tsx", "utf8")
  assert.ok(!landing.includes("FirstRunSurvey"), "landing page never shows the survey")
})

test("Discover keeps the AI box and only falls back to survey rows when the library yields none", () => {
  const p = fs.readFileSync("app/books/page.tsx", "utf8")
  assert.ok(p.includes("Tell us what you like"), "desktop AI box kept")
  assert.ok(p.includes("Ask for something specific..."), "mobile AI bar kept")
  assert.ok(p.includes("specs.length === 0 && surveyAnswers"), "survey rows only when no library specs")
})

test("a failed answer save stays open with an error; dismissals close regardless", () => {
  const c = fs.readFileSync("components/first-run-survey.tsx", "utf8")
  assert.ok(c.includes('if (writeError && outcome === "completed")'), "completed write errors block closing")
  assert.ok(c.includes("This was not saved. Try again."), "visible save error")
})
