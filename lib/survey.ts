// First-run survey: pure logic only (no network, no React). The dialog component
// (components/first-run-survey.tsx) renders the questions and writes survey_events rows;
// Discover (app/books/page.tsx) builds rows from the answers with the same subject feed
// as the library genre rows.

export interface SurveyAnswers { genres: string[]; mood: string; favoriteAuthor: string }
export interface SurveyEvent { event_type: string; genres?: string[] | null; mood?: string | null; favorite_author?: string | null; created_at?: string }

// chip = what the user taps; subject = the Google Books subject feed behind it.
export const SURVEY_GENRES: { chip: string; subject: string }[] = [
  { chip: "Fantasy", subject: "fantasy" },
  { chip: "Romance", subject: "romance" },
  { chip: "Mystery & Thriller", subject: "mystery" },
  { chip: "Sci-Fi", subject: "science fiction" },
  { chip: "Literary Fiction", subject: "literary fiction" },
  { chip: "History", subject: "history" },
  { chip: "Self-improvement", subject: "self-help" },
  { chip: "Memoir", subject: "biography" },
]
export const MAX_SURVEY_GENRES = 3

export const SURVEY_MOODS = ["A page-turner", "Something slow & rich", "To learn something", "To feel seen", "To escape"]

// The mood nudges which picked genre leads the rows; the rest keep the order they were picked in.
const MOOD_LEADS: Record<string, string[]> = {
  "A page-turner": ["Mystery & Thriller", "Romance", "Fantasy", "Sci-Fi"],
  "Something slow & rich": ["Literary Fiction", "Memoir", "History"],
  "To learn something": ["History", "Self-improvement", "Memoir"],
  "To feel seen": ["Literary Fiction", "Memoir", "Romance"],
  "To escape": ["Fantasy", "Sci-Fi", "Romance"],
}
export function orderGenresByMood(genres: string[], mood: string): string[] {
  const leads = MOOD_LEADS[mood] || []
  return [...genres].sort((a, b) => (leads.indexOf(a) === -1 ? 99 : leads.indexOf(a)) - (leads.indexOf(b) === -1 ? 99 : leads.indexOf(b)))
}

// completed or skipped = never ask again; the X (closed_x) = ask again after 7 days (his call, 21 Oct 2026).
export const SURVEY_REASK_AFTER_MS = 7 * 24 * 3600 * 1000
export function shouldShowSurvey(events: SurveyEvent[], now = Date.now()): boolean {
  if (events.some(e => e.event_type === "completed" || e.event_type === "skipped")) return false
  const lastX = Math.max(0, ...events.filter(e => e.event_type === "closed_x").map(e => Date.parse(e.created_at || "") || 0))
  return now - lastX >= SURVEY_REASK_AFTER_MS
}

// Newest completed answers win (events come in created_at-desc order).
export function latestAnswers(events: SurveyEvent[]): SurveyAnswers | null {
  const done = (events || []).find(e => e.event_type === "completed" && Array.isArray(e.genres) && e.genres.length > 0)
  if (!done) return null
  return { genres: done.genres as string[], mood: done.mood || "", favoriteAuthor: done.favorite_author || "" }
}

export function provenanceLine(a: SurveyAnswers): string {
  const bits = [...a.genres]
  if (a.mood) bits.push(a.mood)
  return `Picked from your answers: ${bits.join(" · ")}.`
}

// One Discover row per picked genre, mood order first.
export function buildSurveySpecs(a: SurveyAnswers) {
  return orderGenresByMood(a.genres, a.mood).map(chip => {
    const g = SURVEY_GENRES.find(x => x.chip === chip)
    return {
      key: `survey:${(g?.subject || chip).replace(/\s+/g, "-")}`,
      kind: "genre" as const,
      genre: g?.subject || chip.toLowerCase(),
      title: `Because you enjoy ${chip}`,
      subtitle: "From your welcome answers",
      reason: `You told us you enjoy ${chip}.`,
    }
  })
}
