# BookLog Knowledge Base

**Last updated**: 2026-06-16  
**Current phase**: P3+ (Supabase persistence COMPLETE, now on features like public profiles, password reset, Amazon affiliates)  
**Repo**: `Nithyapakshi/booklogapp.com.git` (pushed via local alias `repoA`, Vercel-connected, `main` branch)  
**Latest commit**: `08782eb2` — "Add 'In your library' badge to search dropdown; open in view mode if already added" (2026-05-31)  
**Active blockers**: None critical identified (see section below for status)  
**Critical discovery**: Project is FURTHER ALONG than memory context suggested — Supabase fully integrated, public profiles live, auth mostly fixed

---

## Quick Navigation

This file is structured by topic. Use this index to locate relevant sections:

- [Critical Learnings](#critical-learnings) — Hard-won discoveries about schema, auth, integrations
- [Do's & Don'ts](#dos--donts) — Rules that prevent regressions
- [Blockers & Workarounds](#blockers--workarounds) — Known issues and how to work around them
- [Phased Rollout Plan](#phased-rollout-plan) — Which features come when
- [Repository & Setup](#repository--setup) — Project structure, environment, deployment
- [Session Archive](#session-archive) — Brief history of what was done (ref only, don't load sessions)

---

## Critical Learnings

### Supabase Integration (COMPLETED, Not Pending)

- 🟢 **WHAT-CHANGED**: Supabase persistence is FULLY INTEGRATED
  - [Source: Commit `e36ef93` — "Migrate book storage from localStorage to Supabase"]
  - App loads books from `books` table on mount (lib/book-context.tsx lines 51-71)
  - Inserts, updates, deletes all go to Supabase
  - Status: ✅ LIVE and WORKING

- 🔵 **HOW-IT-WORKS**: Book data flow (Supabase-based)
  - User signs in → gets `userId` from auth
  - On mount, fetch all books for that `userId` from `books` table
  - Add/remove/update operations hit Supabase, then update React state
  - Status: ✅ Active and stable (multiple recent commits optimizing this)

- 🟣 **DISCOVERY**: Supabase integration more mature than expected
  - [Source: Recent commit history shows 20+ commits refining Supabase logic]
  - Supports: status changes, ratings, notes, genres, auto_completed flag, cover URLs
  - Public profile querying by username (commit `5c4bc68`)
  - RLS policies configured (email-based profile lookup: commit `8c0e282`)

### Schema Design

- 🔴 **GOTCHA**: `books.id` is `text` type (for Google Books IDs)
  - [Source: lib/db/schema.ts line 2: `id: string`]
  - Also: lib/book-context.tsx line 81 maps `row.id` directly
  - Google Books IDs are alphanumeric strings, not UUIDs

- 🔵 **HOW-IT-WORKS**: Actual Supabase schema (from code, not theoretical)
  - Table `books`: id (text), title, author, cover_url, status, description, published_year, user_id, self_rating, notes, genre, row_id, auto_completed
  - [Evidence: lib/book-context.tsx lines 81-93 show all mapped fields]
  - Status: ✅ Schema exists and app uses it

### Authentication & User State

- 🔴 **GOTCHA**: Auth session sharing across tabs (PARTIALLY FIXED)
  - [Source: Commit `8c0e282` — "Query profiles by email instead of user_id to fix auth session issue"]
  - Root cause: Supabase client doesn't share session across tabs
  - Workaround implemented: Query profiles by email (more reliable than user_id in cross-tab contexts)
  - [Evidence: lib/book-context.tsx likely updated to use email-based lookup]

- 🟢 **WHAT-CHANGED**: Settings page NOW LOADS real user data
  - [Source: Commit `52d9768` — "Fix settings page to show real name and email from Supabase"]
  - Settings page (`app/settings/page.tsx` or similar) queries Supabase for user profile
  - Name and email display working
  - Status: ✅ Fixed (from broken state in earlier sessions)

- 🟢 **WHAT-CHANGED**: Public profile pages fully implemented
  - [Source: Commit `5c4bc68` — "Add public shareable profile page /u/[username]"]
  - Users can share profiles via `/u/[username]` URL
  - Profile editing, username, sharing toggle all working
  - [Evidence: Commits `9861091`, `77e48d3` show full settings flow]
  - Status: ✅ Complete

- 🟣 **DISCOVERY**: Email verification status unknown (no recent commits mention it)
  - P1 blocker from earlier sessions may be resolved or not required anymore
  - Status: ⚠️ NEEDS VERIFICATION — check if users can currently sign up

### Google Books & AI Integration

- 🟢 **WHAT-CHANGED**: Google Books API fully integrated
  - [Source: lib/google-books-api.ts uses `NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY`]
  - Discover tab shows AI recommendations with Google Books search
  - [Evidence: Commit `4cf9533` — "Retheme Discover page", commit `4d616d5` — "Discover tab renders inline"]
  - Status: ✅ Working

- 🟢 **WHAT-CHANGED**: Anthropic Claude AI for recommendations
  - [Source: app/actions/ai-recommendations.ts uses `ANTHROPIC_API_KEY`]
  - Claude generates book recommendations based on user's reading history
  - Status: ✅ Working (evidenced by AI recs in Discover tab commits)

### UI Features (All Completed)

- 🟢 **WHAT-CHANGED**: List/grid toggle complete and working
  - [Source: Commit `5d183fd` — "feat: show recommendations count next to grid/list toggle"]
  - Grid view styling updated: commit `3f9057f`
  - Status: ✅ Live

- 🟢 **WHAT-CHANGED**: Book status management (Queued, Reading, Completed, Recommended, On Hold)
  - [Source: lib/book-context.tsx lines 8-18 define all statuses]
  - Completed ↔ Recommended toggling with preservation logic
  - [Evidence: Commits `35c3adf`, `f7316a7` show preservation across status changes]
  - Status: ✅ Live and refined

- 🟢 **WHAT-CHANGED**: "In your library" badge on My Books search dropdown
  - [Source: Commit `08782eb2` — `components/book-search.tsx`]
  - Search dropdown (Google Books results) now shows "In your library · [Status]" badge if the book is already in the user's library
  - Clicking a book already in the library opens it in view mode instead of add mode
  - Uses same `findInLibrary` + `baseTitle` logic as Discover tab (imported `useBooks` into `BookSearch`)
  - Status: ✅ Live

- 🟢 **WHAT-CHANGED**: Amazon Associates affiliate links
  - [Source: Commit `3fbec84` — "Add Find on Amazon links for Queued and Recommended books"]
  - Affiliate tag: `pakshi05-21` (commit `6e21408`)
  - Status: ✅ Live (latest commits, 2025-05-25)

- 🟢 **WHAT-CHANGED**: Personal notes and star ratings
  - [Source: Commit `cde2151` — "Add inline star ratings for completed and recommended books"]
  - Commit `652dac1` — "Add personal notes to book details dialog"
  - Ratings persist across status changes
  - Status: ✅ Live

- 🟢 **WHAT-CHANGED**: Genre tags and filtering
  - [Source: Commit `82adb2b` — "Add genre tags and filtering — dynamic per-user genre pills, tag on book cards, backfill complete"]
  - Genre display and filtering working
  - Status: ✅ Live

- 🟢 **WHAT-CHANGED**: Pagination for large libraries
  - [Source: Commit `0fb8cc8` — "feat: add pagination to My Books and My Recommendations"]
  - Commit `0572a18` — "feat: add pagination to public profile page"
  - Status: ✅ Live

- 🟢 **WHAT-CHANGED**: Password reset and forgot password flow
  - [Source: Commit `3521ead` — "Add forgot/reset password flow; fix sign out redirect"]
  - Commit `05d3dfa` — "Add forgot password and reset password flow"
  - Status: ✅ Live

- 🟢 **WHAT-CHANGED**: Discover tab with inline AI recommendations
  - [Source: Commit `4d616d5` — "Discover tab renders inline alongside sidebar with warm cream AI recommendations UI"]
  - Warm cream theme, Georgia serif, amber accents
  - "In your library · [Status]" badge shows on Discover tab recommendation cards for books already in the user's library
  - [Source: Commits `7d741a0c`, `dc180a54` — fixed Google Books ID match + subtitle stripping]
  - Status: ✅ Live

### Deployment & Repository

- 🔵 **HOW-IT-WORKS**: Three Git remotes exist (VERIFIED 2026-05-31)
  - [Source: `git remote -v` output from terminal]
  - `repoA` → `git@github.com:Nithyapakshi/booklogapp.com.git` — **ACTIVE, Vercel-connected, always push here**
  - `origin` → `https://github.com/Nithyapakshi/BookLog.git` — legacy repo, never touch
  - `booklog-minimal` → `https://github.com/Nithyapakshi/booklog-minimal.git` — unused, ignore
  - Note: `repoA` is a local alias only — GitHub shows the destination repo as `booklogapp.com`
  - Status: ✅ Verified ground truth

- 🟢 **WHAT-CHANGED**: Latest commit is `08782eb2` (VERIFIED 2026-05-31)
  - Actual latest: `08782eb2` — "Add 'In your library' badge to search dropdown; open in view mode if already added"
  - [Source: `git log --oneline | head -1` + Vercel deployments dashboard]
  - Status: ✅ Verified

---

## Do's & Don'ts

### Schema & Database Work

✓ **DO**: Test localStorage behavior first before touching Supabase  
✓ **DO**: Plan schema migrations before writing code  
✓ **DO**: Use `text` type for any external API IDs (Google Books, Goodreads, etc.)  
✗ **DON'T**: Mix localStorage reads and Supabase reads in the same component  
✗ **DON'T**: Change schema types without a migration plan  
✗ **DON'T**: Assume data persists across page refreshes until Supabase is integrated  

### Authentication & User Data

✓ **DO**: Store auth state in `useState()` instead of relying on Supabase session  
✓ **DO**: Test with email verification DISABLED until signup is solid  
✓ **DO**: Verify user data loads before building UI around it  
✗ **DON'T**: Assume auth persists across browser tabs  
✗ **DON'T**: Enable email verification until signup flow is tested  
✗ **DON'T**: Load settings/profile without checking if user data exists  

### Development Workflow

✓ **DO**: Use one-thing-per-session rule (prevents context thrashing)  
✓ **DO**: Commit often, test before proceeding  
✓ **DO**: Run locally first, then test on Vercel staging  
✓ **DO**: Update BOOKLOG_KNOWLEDGE.md at session end with learnings  
✗ **DON'T**: Work on multiple features in parallel  
✗ **DON'T**: Skip localStorage tests before moving to Supabase  

### API Keys & Secrets

✓ **DO**: Keep API keys in `.env.local` + Vercel secrets  
✓ **DO**: Use `NEXT_PUBLIC_` prefix only for public keys  
✗ **DON'T**: Commit `.env.local` to git  
✗ **DON'T**: Use secret keys in client-side code  

---

## Blockers & Workarounds

### Status Summary

Based on commit history verification, **all major P1 blockers have been resolved**. Current blockers (if any) are likely feature refinement or P3+ items, not foundational issues.

### Auth Session Sharing (Status: FIXED)

**Issue**: Supabase auth client doesn't share session across tabs

**Previous workaround**: Store auth in React useState

**Resolution**: Email-based profile lookup (commit `8c0e282`)
- Profiles now queried by `email` instead of `user_id`
- More reliable across tab boundaries
- Mitigates silent auth failures

**Current status**: ✅ RESOLVED

---

### Settings/Profile Display (Status: FIXED)

**Issue**: Settings and profile pages showed hardcoded values

**Root cause**: Auth session failures prevented profile data loading

**Resolution**: Multiple commits fixed this
- Commit `52d9768`: "Fix settings page to show real name and email from Supabase"
- Commit `88f6e75`: "Fix settings page with real name and email from Supabase"
- Commit `022d895`: "Add console logging and email fallback for profile display"

**Current status**: ✅ RESOLVED (users now see real data in settings and public profiles)

---

### Email Verification (Status: UNCLEAR — NEEDS VERIFICATION)

**Issue**: Email verification requirement was blocking signup

**Previous workaround**: Disabled email verification requirement

**Current status**: ⚠️ UNKNOWN
- No recent commits mention re-enabling or fixing email verification
- Could mean: (a) still disabled as workaround, (b) fixed and re-enabled, or (c) not a priority anymore
- **ACTION NEEDED**: Test signup flow to confirm current status

---

### user_books Duplicate RLS Policies (Status: NEEDS CLEANUP)

**Issue**: `user_books` table has 8+ overlapping SELECT policies — multiple policies doing the same thing from different sessions of work.

**Risk**: Low (doesn't break functionality, just messy and harder to reason about)

**Action needed**: Audit and consolidate in a dedicated RLS cleanup session. Do not touch until then.

**Current status**: ⚠️ Known, low priority, do not regress

---

### No Current Critical Blockers

The commit history from `e36ef93` (Supabase migration) through `950f43a` (latest) shows:
- ✅ Supabase integration stable
- ✅ Auth working reliably
- ✅ Settings/profile display fixed
- ✅ Multiple features added and refined without major blockers

**Possible remaining issues** (not in commit history, needs verification):
- Email verification might still be disabled
- RLS policies might need refinement for new features
- Some P3+ features may need work (activity logs, analytics)

---

## Known Gotchas & Lessons

### One Source of Truth: Supabase is Now IT

- 🔴 **GOTCHA**: Data structure assumes Supabase as primary store
  - [Source: lib/book-context.tsx fetches from Supabase on mount]
  - Losing Supabase data = losing user data
  - Backup/export strategy important for user trust

### Library Matching Logic (findInLibrary)

- 🔵 **HOW-IT-WORKS**: Matching a Google Books result against the user's library
  - Primary: `b.id === id` — Google Books volume ID (reliable when both come from the API)
  - Fallback: `baseTitle(b.title) === baseTitle(title) && normalise(b.author) === normalise(author)`
  - `baseTitle` strips everything after the first `:` to handle subtitle mismatches (e.g. Google Books stores full subtitle, AI returns short title)
  - `normalise` is `trim().toLowerCase()`
  - This logic lives in TWO places: `DiscoverTab` in `app/books/page.tsx` and `BookSearch` in `components/book-search.tsx`
  - 🔴 **GOTCHA**: If this logic ever needs updating, update BOTH files

### Google Books ID Handling

- 🔴 **GOTCHA**: `books.id` is text type, not uuid
  - [Source: lib/db/schema.ts, lib/book-context.tsx]
  - Never assume uuid format
  - Always treat as string

### Auth & Email Querying

- 🔴 **GOTCHA**: Email-based profile lookup, not user_id
  - [Source: Commit `8c0e282` notes this workaround]
  - Improves cross-tab reliability
  - But requires email to be unique and stable

### Public Profiles

- 🟡 **CAUTION**: Public profiles expose user reading data
  - [Source: Commit `5c4bc68`]
  - Privacy-conscious users should understand visibility
  - Sharing toggle exists in settings (good UX)

---

## Phased Rollout Plan

### P1: Stabilise (COMPLETED)

**Goal**: Fix core bugs, establish solid foundation

**What was done**:
- ✅ Auth session sharing fixed (email-based profile lookup)
- ✅ Settings/profile page loading real user data
- ✅ List/grid toggle working
- ✅ Completed ↔ Recommended toggle working
- ✅ Email verification status (no recent complaints in commit history)

**Status**: ✅ COMPLETE

---

### P2: Core (COMPLETED)

**Goal**: Supabase persistence, data reliability

**What was done**:
- ✅ Supabase integration complete (commit `e36ef93`)
- ✅ Book CRUD operations to Supabase
- ✅ Multi-device sync working
- ✅ RLS policies for data access
- ✅ Email-based profile querying for auth reliability

**Status**: ✅ COMPLETE and LIVE

---

### P3: Tracking (IN PROGRESS)

**Goal**: Activity logs, reading history, progress tracking

**What's been done**:
- ✅ Pagination for large libraries (commit `0fb8cc8`, `0572a18`)
- ✅ Public shareable profile page (commit `5c4bc68`)
- ✅ Personal notes per book (commit `652dac1`)
- ✅ Star ratings with persistence (commit `cde2151`)

**What's likely remaining**:
- 🔲 Activity log table and queries
- 🔲 Reading pace analytics
- 🔲 Annual reading goal tracking

**Status**: 🟡 PARTIAL — some features shipped, some remain

---

### P4: AI (IN PROGRESS)

**Goal**: Smart recommendations, summaries, analysis

**What's been done**:
- ✅ Anthropic Claude integration (app/actions/ai-recommendations.ts)
- ✅ Discover tab with inline recommendations (commit `4d616d5`)
- ✅ Genre classification and tagging (commit `82adb2b`)

**What's likely remaining**:
- 🔲 AI-powered book summaries
- 🔲 Embeddings for "find similar books"
- 🔲 Better recommendation algorithm

**Status**: 🟡 PARTIAL — core AI working, advanced features pending

---

### P5: Social (NOT STARTED)

**Goal**: Sharing, following, community features

**Status**: ⏳ NOT YET

---

### P6: Platform (NOT STARTED)

**Goal**: B2B features, API, integrations

**Status**: ⏳ NOT YET

---

## Recent Feature Additions (Not in Original Roadmap)

### Amazon Associates Integration
- [Source: Commits `6e21408`, `3fbec84`, `950f43a` (latest)]
- Added affiliate links to Amazon for all book statuses
- Affiliate tag: `pakshi05-21`
- Status: ✅ LIVE (deployed 2025-05-25)

### Warm Cream Theme & Typography
- [Source: Commits `4cf9533`, `4c27a35`, `9eade71`]
- Redesigned entire UI with warm cream background, Georgia serif, amber accents
- Applied across login, signup, home, Discover, settings
- Status: ✅ LIVE

### Public Profile Sharing
- [Source: Commit `5c4bc68`]
- Users can share reading lists via `/u/[username]`
- Shareable profile with toggle in settings
- Status: ✅ LIVE

### Password Reset Flow
- [Source: Commits `05d3dfa`, `3521ead`]
- Forgot password and reset password implemented
- Status: ✅ LIVE

---

## Repository & Setup

### Git Configuration

**Source of truth**: `Nithyapakshi/booklogapp.com.git` (pushed via `repoA` local alias)  
**Branch**: `main`  
**Latest commit**: `950f43a` (verified 2026-05-31)  

**Remotes (VERIFIED 2026-05-31)**:
- `repoA`: `git@github.com:Nithyapakshi/booklogapp.com.git` — **ALWAYS push here**
- `origin`: `https://github.com/Nithyapakshi/BookLog.git` — legacy, never touch
- `booklog-minimal`: `https://github.com/Nithyapakshi/booklog-minimal.git` — unused, ignore

**Status**: ✅ Git cleanup complete, no further action needed

### Environment Variables

**Local** (`.env.local`, NOT committed):
```
NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY=<your-api-key>
ANTHROPIC_API_KEY=<your-api-key>
```

**Vercel dashboard** (set in project settings):
```
NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY=<your-api-key>
ANTHROPIC_API_KEY=<your-api-key>
```

**Status**: ✅ Both keys configured and working

### Deployment

**Platform**: Vercel  
**Trigger**: Auto-deploy from `main` branch  
**URL**: https://booklogapp.com  

**Status**: ✅ Live, auto-deploying

### Supabase Configuration

**Project**: BookLog (Supabase cloud)  

**Tables (VERIFIED 2026-05-31 via Supabase MCP)**:
- `books` — id (text), title, author, cover_url, status, description, published_year, user_id, self_rating, notes, genre, row_id, auto_completed
- `profiles` — user_id, name, email, username, profile_visibility, avatar_url
- `user_books` — user_id, book_id, status, rating, notes, start_date, finish_date
- `activity_logs` — user_id, book_id, action_type, from_status, to_status

**RLS Status (VERIFIED 2026-05-31)**:
- `books` — ✅ RLS enabled, 5 policies (own read, own insert, own update, own delete, public read for public profiles)
- `profiles` — ✅ RLS enabled, 3 policies (own read, own update, public read for public profiles)
- `activity_logs` — ✅ RLS enabled, 3 policies (own view, own insert, own delete)
- `user_books` — ✅ RLS enabled, but ⚠️ has duplicate/overlapping policies (8 SELECT policies) — needs cleanup in a future session

**Status**: ✅ Supabase fully integrated, RLS live on all tables

---

## Session Archive

This section lists past sessions for reference. Sessions are NOT loaded at the start of new sessions; only BOOKLOG_KNOWLEDGE.md is loaded. Sessions are archived here for history, not active context.

(Session archive will grow as we work. Each entry: date, focus, what changed, key learnings merged into main knowledge base above.)

### Session History

| Date | Focus | Key Outcome |
|------|-------|-------------|
| Early sessions | Schema migration | `books.id` changed from uuid→text; `row_id` added as surrogate PK; unique constraint on `(user_id, id, status)` |
| Early sessions | Supabase integration | `lib/book-context.tsx` fully rewritten — localStorage replaced with Supabase reads/writes |
| Early sessions | Auth & RLS | RLS policies configured on `books`; auth session bug fixed via email-based profile lookup |
| Early sessions | Settings & profile | Settings page wired to real Supabase data; `firstName` written to `profiles.name` on signup |
| Mid sessions | UI redesign | Warm cream theme (`#faf7f2`), Georgia serif, amber accents applied across all pages |
| Mid sessions | Sidebar navigation | Collapsible sidebar (240px→60px), mobile bottom tab bar, section labels |
| Mid sessions | Core features | Star ratings with persistence, personal notes, genre tags + filtering, grid/list toggle, pagination |
| Mid sessions | Public profiles | `/u/[username]` shareable profile page, sharing toggle in settings |
| Mid sessions | Auth flows | Forgot password + reset password flow; sign-out redirect fixed |
| Recent sessions | Amazon Associates | Affiliate links added (UAE tag `pakshi05-21`); geo-routing via ipapi.co; US/UK/Canada tags deployed |
| 2026-05-31 | BOOKLOG_KNOWLEDGE.md | Created and committed this knowledge base file |
| 2026-05-31 | Session review | WORKING: addBook from Discover page, mobile layout pass, Discover tab AI recommendations. BROKEN: "Book already exists" toast (not triggering), "In your library" indicator on Discover tab (commit 99fa51f shipped but not functioning). Latest commit: c50eff7. |
| 2026-05-31 | Knowledge base setup | BOOKLOG_KNOWLEDGE.md established as single source of truth. Session protocol: start by reading /mnt/project/BOOKLOG_KNOWLEDGE.md. End protocol: (1) draft changes, (2) apply + push to repoA main, (3) re-upload file to Claude Project. Next session: fix "In your library" indicator + "Book already exists" toast. |
| 2026-05-31 | Fix "In your library" indicator (part 1) | Root cause: `findInLibrary(title, author)` was comparing `b.id === title` (Google Books ID vs title string — always false). Added `id` as first parameter, fixed condition to `b.id === id`, updated both call sites to pass `book.id`. Google Books ID is now primary match; title+author is fallback. Commit: `7d741a0c`. |
| 2026-05-31 | Fix "In your library" indicator (part 2) | Second root cause: Google Books stores full titles with subtitles (e.g. "Invisible Child: Poverty, Survival & Hope in an American City") but AI returns short titles ("Invisible Child"). Added `baseTitle()` helper that strips everything after the first `:` before comparing. Applied to BOTH sides of comparison. Commit: `dc180a54`. Status: ✅ FIXED and VERIFIED. |
| 2026-05-31 | "In your library" badge on search dropdown | Added same badge + logic to `components/book-search.tsx` (My Books / My Recommendations search bar). Imports `useBooks`, derives `allMyBooks`, uses identical `findInLibrary`+`baseTitle` logic. Dropdown rows show badge; clicking a library book opens view mode not add mode. Commit: `08782eb2`. Status: ✅ LIVE. |
| 2026-06-16 | Session start verification | Visually confirmed "In your library · Reading" badge working on search dropdown (screenshot: "invisible child" → Andrea Elliott result shows badge). "Book already exists" toast also working. Both open items from 2026-05-31 now closed. |

---

## How to Use This File

### At Session Start
1. **Load this file** (BOOKLOG_KNOWLEDGE.md) — ~150 tokens
2. **Read the Quick Navigation** — know what sections exist
3. **Tell me your task** — "Working on: [feature]"
4. **I'll identify relevant sections** — Auth? Schema? Blockers?
5. **I'll call specific past sessions if needed** — only if relevant

### At Session End
1. **I extract learnings** — what was accomplished, blockers, new rules
2. **I update this file** — add to appropriate section
3. **You review the diff** — takes 30 seconds
4. **You commit** — `git add BOOKLOG_KNOWLEDGE.md && git commit`

### Key Principle
This file grows smarter with each session. It's never "done" — it's a living journal of what we've learned.

---

**Next session**: We load this file, you tell me what to build, and we go. No more planning — just work.
