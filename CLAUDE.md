# BookLog — project handover

Onboarding for anyone (human or AI tool) picking up this codebase. Last updated 21 Oct 2026.

## What this is

BookLog is a personal reading tracker, live in production at https://www.booklogapp.com with real users (~84 accounts, ~700 books as of Oct 2026). Users keep Reading / Queued / Completed / Recommended / On Hold shelves with notes, ratings, Google Books search, and AI-powered Discover recommendations. Repo: https://github.com/Nithyapakshi/booklogapp.com (default branch `main`, public). A second domain, booklog.app, also exists.

## Golden rules (the owner's standing rules — read first)

1. **No regression on a working product. Existing users must never be affected by a change.** This is the top rule, restated many times.
2. **Production pushes need his explicit OK.** Work on a branch, open a PR, verify on the Vercel preview, then wait for his go before merging to `main`.
3. **Verify before merge:** run the full test suite, and click through the change on the Vercel preview (light + dark where UI). Data-integrity checks after anything that touches user data.
4. **Manual testing against the live app happens only in the synthetic test account** — never in a real user's data.
5. **Supabase access tokens are one-use:** he issues a temporary token for a specific task and revokes it after. Ask for one when needed; never store one.
6. **A review/critic pass happens before merging changes that affect live users.**
7. **Keep the product minimalistic and clean** — he rejects busy designs.
8. **Emails to users always need his review and approval of the draft first.**
9. **Roadmap hygiene:** update the roadmap doc as part of every release so statuses match what is actually live.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript; package manager **pnpm 10.6.5**
- Supabase (Postgres database + Auth with email confirmation). **Separate Supabase projects for preview and production.**
- Google Books API (search/metadata) with **Open Library fallback**; Anthropic API for AI recommendations (monthly budget cap $15); Resend for the feedback-form email
- Tailwind + Radix/shadcn UI; `next-themes` for light/dark/system theme
- Hosting: Vercel (project `booklog-app`); production deploys from `main`, every PR/branch push gets a preview deployment

## Architecture and key files

- `app/` — App Router pages. Server logic lives in **server actions**, not API routes: `app/actions/book-actions.ts` (library mutations), `app/actions/ai-recommendations.ts` (Ask AI), `app/actions/discover-rows.ts` + `app/actions/free-spirit.ts` (Discover), `app/actions/feedback.ts`, `app/actions/scan-isbn.ts` (barcode).
- `lib/book-context.tsx` — the client-side library state (add/move/delete/finish book). Most user-facing library behavior flows through here.
- `lib/book-search.ts`, `lib/google-books-api.ts`, `lib/book-catalog.ts` — search with retry/fail-fast and Open Library fallback for thin Google results.
- `lib/discover-rows.ts`, `lib/same-spirit.ts` — Discover recommendation rows.
- `lib/reading-dates.ts` — start/finish dates (month/year by default, day optional).
- `lib/book-enrichment.ts` — cover/metadata backfill (heals cover-less books on open, fills blanks only). `lib/book-identity.ts` — duplicate detection.
- `lib/supabase/{client,server}.ts`, `lib/db/schema.ts` — data access and schema types.
- `components/` — `book-card.tsx`, `book-search.tsx`, `finish-book-dialog.tsx` (rating + finish month prompt), `discover-carousel.tsx`, `book-barcode-scanner.tsx`, `auth-provider.tsx`.
- `supabase/migrations/` — SQL migrations, **applied manually in the Supabase SQL editor** (preview first, then prod). There is no automated migration runner.
- `tests/*.test.cjs` — the test suite (plain Node test runner, no framework).

## Environment variables

No `.env.example` in the repo. Values live in the Vercel project's env settings (and Supabase); **never commit secrets**. Names used by the code:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (server code also reads `SUPABASE_URL` / `SUPABASE_ANON_KEY`) |
| `NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY` | Browser-side Google Books key — HTTP-referrer locked to booklogapp.com origins |
| `GOOGLE_BOOKS_SERVER_KEY` | Server-only Google Books key (AI recs, enrichment) |
| `ANTHROPIC_API_KEY` | Discover/Ask AI recommendations |
| `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL` | Feedback form delivery |

## Running tests

```
pnpm install
pnpm test        # node --test tests/*.test.cjs
pnpm typecheck   # tsc --noEmit
```

Current state: **176 tests, 175 pass.** The 1 failure is the pre-existing signup-metadata test, which fails on `main` too — known, not a blocker. Tests are pure-logic Node tests over `lib/` functions and run in a few seconds.

## Deploy flow

1. Branch from `main`, open a PR. Vercel builds a preview per branch (previews sit behind Vercel login unless shared).
2. Verify: full test suite + preview click-through.
3. He says "push to prod" (or merges). Squash-merge to `main`; Vercel deploys production to www.booklogapp.com automatically.
4. Post-deploy: verify prod is unchanged/healthy and data is untouched.

**Branch protection (added 21 Oct 2026):** ruleset "main protection" requires a PR before merging (no required approvals), requires the Vercel status checks to pass, and blocks force-pushes and deletion of `main`. His admin role can bypass when needed.

**Vercel free plan:** 100 deployments/day cap — hit once (14 Oct). Batch related fixes into one PR; avoid pushing test-only branches.

## Current state (21 Oct 2026)

**Live on prod:** shelves with add/move/delete, private notes, ratings, Google Books search with retry + Open Library fallback, manual add/edit (title + author only, metadata auto-fetched), duplicate warning, Discover rows + Ask AI, barcode scan, CSV export, dark mode, start/finish dates (month/year), rating+finish prompt on shelf moves, guided first-book empty state, slim signup with signed-in confirm landing, feedback form.

**Open PRs:**
- #47 — ask for rating + finish month when a book is added straight to Completed (ready, checks green)
- #46 — empty shelf: point to Discover for ideas
- #39 (draft) — budgeted "same spirit" recommendations with catalog verification
- #33 (draft) — same-spirit cache + atomic AI spend caps
- #23 (draft) — standing rules as automatic CI checks; built but never activated (no CI workflow exists yet — the only status checks today are Vercel's)
- #1 (draft, 7 months stale) — Vercel's React Server Components CVE bump

**In progress / awaiting his OK:**
- Onboarding survey flow with a `survey_events` Supabase migration — built, pending his OK
- Same-spirit AI gradient: re-test after the #39 pipeline hardening; plan + cost baseline go to him before any paid run (Anthropic cap $15/mo)
- Month/year date standardization across all date entry points (parked)
- Next in the roadmap order: single-book sharing, then import; Stats tab after the AI work
- Cleanup PR for legacy debug routes (old `app/auth-*`, `app/basic-*`, `app/dashboard-*`, `app/books-direct` pages and `app/api/check-*`/`debug` endpoints)
- LinkedIn build-in-public post awaiting his critique

**Branch map:** `main` + 6 branches with the open PRs above + 6 `test/*` fixture branches used by the AI-rec pipeline tests (keep). Old `revival/*` working branches were deleted 21 Oct 2026 after verifying their content was fully merged.

## Known issues / gotchas

- **Google Books flakiness:** returns 503s/empty results regularly. The app retries, fails fast, and falls back to Open Library. Its daily quota can be exhausted by heavy testing.
- **The browser Google Books key is referrer-locked** to booklogapp.com, so local dev search fails unless you use a separate dev key.
- **Anthropic monthly cap ($15)** pauses Discover/Ask AI when hit.
- Repo still contains legacy debug pages/routes (see cleanup item above) — ignore them; they are not linked from the app.
- The pre-existing signup-metadata test failure (above) — don't "fix" it by deleting the test; it pins a real gap.

## Links

- Production: https://www.booklogapp.com
- Repo: https://github.com/Nithyapakshi/booklogapp.com
- Roadmap: the "BookLog_Roadmap_June2026" Google Doc in the owner's Drive (kept current; ask the owner for the link)
- Metrics: Excel dashboard in his Google Drive (users, books, per-tab averages; excludes his own activity)
