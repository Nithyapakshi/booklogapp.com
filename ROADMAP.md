# BookLog roadmap

Synced from the canonical [BookLog roadmap](https://docs.google.com/document/d/1zfv9pcx0q24nD5AR_fSGH3q-RNXN3l3sNcoXgZyyPfo/edit).

Last synced: 30 October 2026. This is the reviewer-readable copy. Keep it aligned with the Google Doc in the same change whenever roadmap content or status changes. The Google Doc remains the canonical feature table. Its cover still says 27 October; the synced content below includes the 29 and 30 October live notes. No automated sync is installed.

BookLog

User Stories & Product Roadmap

booklogapp.com  ·  Last updated: 27 October 2026

## Part 1 — Live Features

### 1. Account & Authentication

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Sign up | Create an account with email and one password; names optional | ✅  DONE |  |
| Log in | Sign in securely; reading data loads automatically on login | ✅  DONE |  |
| Sign out | Securely log out from the navigation bar | ✅  DONE |  |
| Forgot password | Request a password reset link via email | ✅  DONE |  |
| Reset password | Set a new password via the reset link | ✅  DONE |  |
| Sign in with Google | Google sign-in alongside email/password | DONE | Existing library preserved. |
| Signup confirmation | Branded email; confirmation returns signed in to library | DONE | Email verification remains enabled. |

### 2. Book Search & Adding Books

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Search for books | Search by title or author via Google Books API; shows cover, title, author, summary | ✅  DONE | Retry once, then Open Library fallback; short outage circuit breaker. Mobile search and manual entry available. |
| Add books to collection | Add from search results to any reading status with one click | ✅  DONE |  |
| In your library badge | Search results show 'In your library · [Status]' if book already exists; opens in view mode | ✅  DONE |  |
| Duplicate guard toast | Warn if a book already exists in the library | ✅  DONE | Inline message and View existing book. |
| Manually add a book | Add books not in Google Books by typing details manually | ✅  DONE | Title, optional author, status including Recommended; rating prompt and blank-only enrichment. |
| Scan barcode to add | Use phone camera to scan a book barcode and add it instantly | ✅  DONE | Camera or typed ISBN with search/manual fallback. Real phone-camera owner test remains pending. |
| First-book help | Empty-library search prompt and dismissible starter titles | DONE | Starter titles disappear as the shelf grows. |
| Cover photo to add | Identify a book from a cover photo | CANDIDATE | Not built. Paid fallback after barcode value is proven; confirm match. |

### 3. Reading Status & Organisation

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| 5-status library | Reading, Queued, Completed, My Recommendations, On Hold | ✅  DONE |  |
| Move books between statuses | Three-dot menu to change status on any book | ✅  DONE |  |
| Completed + Recommendations overlap | Books can exist in both Completed and My Recommendations simultaneously | ✅  DONE |  |
| Delete books | Remove any book using the trash icon | ✅  DONE |  |
| Genre tags + filtering | Tag books with genres; filter library by genre pill | ✅  DONE | Genre filtering live; broader reader-defined tags remain a requirement. |
| Star ratings | Rate completed/recommended books 1–5 stars; persists across status changes | ✅  DONE |  |
| Personal notes | Write notes against any book in your library | ✅  DONE | Typed notes live; dictation belongs to planned voice commands. |
| Pagination | Large libraries paginated on My Books and public profile | ✅  DONE |  |
| Track reading dates | Record start and finish dates per book | ✅  DONE | Month/year with optional exact day for start/finish; editable dates on Reading books; finish plus rating on Completed/Recommended adds and moves. |
| Edit book details | Edit title, author, or cover image of any book | 🟡  PARTIAL | Title, author and dates editable. Blank cover/description enrichment is live; manual cover upload not built. |
| Star / favourite a book | Mark all-time favourites with a star for quick reference | 🔲  NOT STARTED | Not built; Recommendations star is not a favourite. |
| Sort books | Sort by date added, title, author, or rating | 🔲  NOT STARTED | Parked by the owner. No sort control in the app. |
| Within-library search | Search within your own collection by title or author | ✅  DONE | Title/author filter above each list. |
| Library load recovery | Parallel books/notes reads, clear loading state and safe Retry. Live 29 Oct 2026; saved libraries unchanged. | DONE |  |
| Metadata and duplicate safety | Fill missing details only; latest-edition results; near-duplicate warning | DONE | Never overwrite entered details or block Add anyway. |
| Did Not Finish | Separate a stopped book from On Hold | CANDIDATE | Not built; no build approval. |
| Reading progress / journal | Optional page or percentage progress with dated notes | CANDIDATE | Not built; no build approval. |
| Reread history | Keep earlier reading dates when rereading | CANDIDATE | Not built. |
| Owned / format / edition | Distinguish ownership and print, ebook or audio editions | CANDIDATE | Not built. |
| Half-star ratings | Allow half-star ratings | CANDIDATE | Not built. |
| Quotes / highlights | Private passages with page reference and optional camera capture | CANDIDATE | Not built. |
| Bulk editing | Change statuses or tags for several books | CANDIDATE | Not built. |

### 4. Display & View Options

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Grid view | Visual grid with prominent book cover images | ✅  DONE |  |
| List / table view | Compact list view for a quick overview | ✅  DONE | Live 30 Oct: long genres wrap in mobile list rows; stars stay right and book details remain readable. Desktop unchanged. |
| Toggle between views | Switch grid ↔ list with a single click | ✅  DONE |  |
| Dark mode | Switch between light and dark mode | ✅  DONE | Live: selectable light and dark themes. Warm theme remains the default. |

### 5. AI Recommendations (Discover Tab)

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| AI recommendations | Claude AI analyses reading history and surfaces personalised book suggestions | ✅  DONE | Personal author/genre and free editorial same-spirit rows; Ask AI subject/taste matching; verified English covers; no padding. Rated rows require 5 eligible books; at most 3 personal rows. |
| Add AI recs to collection | Add a recommended book to any status with one click | ✅  DONE |  |
| In your library badge on Discover | Discover tab shows status badge if book already in library | ✅  DONE |  |
| Trending books | Curated list of popular books other BookLog users are reading | LICENSING HOLD | NYT Fiction / Non-Fiction design accepted. No implementation or API access until licensing is cleared. |
| Browse by genre | Explore and discover new books by genre | 🟡  PARTIAL | Library-based genre rows live; standalone genre browsing not built. |
| More from this author | Surface other books by the same author as a book in your library | 🟡  PARTIAL | Library-based author rows live; fuller book-details and rating-based selection not built. |
| Discover loading and recovery | Keep prior rows while loading; Retry on failure | DONE | Failures retry after an hour; honest no-match state. |
| Cross-device Discover history | Sync Discover history between devices | NOT STARTED | Current session history is device-local. |
| Paid same-spirit generation | Broader paid recommendations with cache and budget controls | PARKED | Draft only; production disabled. Quality not validated; new test/spend approval needed. |
| Discover shelf-change control | Change shelf for an existing book from Discover details | CANDIDATE | Not approved; new books already support Add to Collection. |
| Welcome chooser | Optional taste questions for new accounts without personal rows | DONE | Eligible accounts created from 25 October noon Dubai; Skip/answered never again. |
| Discovery filters | Mood, pace, length and sourced content-warning filters | CANDIDATE | Not built; metadata coverage must be verified. |
| Newsletter discovery | Find books from reader-selected newsletters | CANDIDATE | Not built. Review queue first proposed; ratings coverage, permissions and notifications unresolved. |

### 6. Profile & Settings

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Account settings | View and update profile information | ✅  DONE |  |
| Public profile /u/[username] | Shareable reading profile at a public URL | ✅  DONE |  |
| Profile visibility toggle | Control whether your profile is public or private | ✅  DONE |  |
| Update name and username | Edit display name and username from settings | ✅  DONE |  |
| Granular sharing settings | Control which tabs or statuses are visible on public profile | 🟡  PARTIAL | Public/private plus Recommendations-only or full-library sharing live; per-tab controls not built. |
| Profile picture / avatar | Upload and display a profile avatar | 🔲  NOT STARTED |  |
| Share individual books | Named snapshot links with quiet sharing controls | DONE | Display name, title, author and cover only; no notes or ratings. Persistent links without expiry or revoke. |
| Feedback form | Send feedback with a reply-to address | DONE |  |
| Privacy notice | Public notice linked from home, login and signup | DONE |  |
| Editable reading preferences | Let readers update taste preferences | NOT STARTED | Broader profile editor not built. |

### 7. Amazon Affiliate Links

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Find on Amazon — UAE | Affiliate links on Queued and Recommended books; UAE tag live | ✅  DONE |  |
| Find on Amazon — US / UK / CA | US, UK, Canada affiliate tags signed up and deployed in code | ✅  DONE |  |
| Geo-routing | ipapi.co detects user location and routes to correct Amazon marketplace | ✅  DONE |  |
| Find on Amazon — India | Amazon.in affiliate signup and tag in lib/amazon-link.ts | 🔲  NOT STARTED |  |

## Part 2 — Roadmap

### 8. Reading Goals & Stats

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Reading statistics dashboard | Total books read, avg per month, favourite genres, most productive months | DESIGN STAGE | Design only; monthly/yearly summaries parked pending use. |
| Monthly / yearly reading summary | Visual summary of books read by month and year | PARKED | Not built; reliable reading dates required. |
| Reading streaks | Optional reading-day log, separate from next-read choice | MOCKUP ONLY | No inferred history, required pages/timer/journal or lost-streak warning. No build approved. |
| Annual reading goal | Set a target number of books for the year and track progress | ⛔  EXCLUDED | Excluded; associated goal-pace notifications also excluded. |
| Choose your next read | Search Queued books and keep one chosen intention | LIVE | One Queued book, saved privately. Change or clear; Start reading separate. Clears on start, move or delete. Other tabs may need refresh. |
| Ordered next-read shortlist | Manually prioritize several queued books | CANDIDATE | Not built; distinct from the accepted one-book intention design. |

### 9. Social & Sharing

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Recommend to a friend | Send a book recommendation directly to a friend on BookLog | 🔲  NOT STARTED |  |
| See what friends are reading | Follow friends; see their current reads and recent completions | 🔲  NOT STARTED |  |
| Book clubs | Create or join a book club with a shared reading list and discussion | 🔲  NOT STARTED | Large scope — later phase |
| People search / profiles | Find readers and browse shared profiles | NOT STARTED | Existing public profile links already work. |
| Selective shared shelves / buddy reads | Opt-in shelf sharing and small shared reading groups | CANDIDATE | Not built. Demand, audience controls and moderation first. |
| Local physical-book exchange | Opt-in nearby lending or swaps using a separate offered shelf | LATER CANDIDATE | Not built. No buying/selling. Validate matching copies, safe handoff and privacy; no public exact locations. |
| Currently-reading embed | Display a shared reading book on another website | CANDIDATE | Not built; separate from profile links and widgets. |

### 10. Import & Export

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Goodreads import | Import reading history and library from Goodreads with one click | PARKED | Not built; discussion only, no implementation approved. |
| Export reading list | Download entire collection as CSV or PDF | 🟡  PARTIAL | CSV is live (Settings, Your data). PDF is not built. |
| Other imports | StoryGraph / standard CSV / Bookcase / Amazon import | PARKED / CANDIDATE | Not built; review and reconciliation required. |

### 11. Notifications & Reminders

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Custom SMTP via Resend | Transactional emails routed through Resend for reliability | PARKED | Current branded confirmation works; custom sender not needed now. |
| Reading reminders | Daily or weekly reminder to read via email or push notification | 🔲  NOT STARTED | Opt-in only; no annual-goal pace warnings. |
| New book alerts | Notify when a favourite author releases a new book | 🔲  NOT STARTED |  |
| In-app notifications | Explain background book additions and other opt-in updates | NOT STARTED | Needed before automated newsletter additions. |

### 12. Voice Integration

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Voice search — Phase 1 | Use Web Speech API to search for and add books by voice | 🔜  PLANNED |  |
| Voice commands — Phase 2 | Status changes, add/remove books and dictated notes | 🔜  PLANNED | After voice search; confirm matches and destructive actions. |

### 13. Mobile & PWA

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| PWA (Progressive Web App) | Installable web app as interim step before native app | 🔜  PLANNED | Optional mobile-web path; not a prerequisite delaying native feasibility. |
| Native iOS & Android app | Locally bundled Capacitor client reusing existing screens/backend | PLAN PREPARED | Build not approved. Prove sign-in/search/add/status/note/relaunch on both devices; RN/Expo fallback only if needed. |
| Offline access | View library without an internet connection | 🔲  NOT STARTED | Viewing first; no offline writes or conflict handling approved. |
| Home screen widget | Widget showing currently reading book | 🔲  NOT STARTED |  |
| Mobile account and release readiness | Deletion, privacy disclosures, login and store requirements | NOT STARTED | Part of mobile feasibility planning; no accounts, fees or release approved. |

### 14. Distribution & Growth

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| BookLog Social Content Tool | Daily email digest: auto-generated visual card + caption + comment suggestions for X and Instagram | 🔜  PLANNED | Separate growth tool, not a reader feature; no dated build commitment. |
| Auto-post to X | Automatically post daily book content to BookLog X account | 🔜  PLANNED | Phase 2 of Social Content Tool. Interim from 30 Oct: hand-written posts scheduled in Buffer (see X account row). |
| Auto-post to Instagram | Auto-post to BookLog Instagram via Graph API | 🔜  PLANNED | Phase 3 of Social Content Tool |
| Auto-comment on book posts | 2–3 daily comments on relevant posts on X and Instagram | 🔜  PLANNED | Not launched; separate approval required. Interim from 30 Oct: approval-gated reply drafts on X (see row below). Fully automatic replies not advised: X treats automated replies as spam. |
| Public web discovery | Server-rendered homepage, metadata, canonical and public sitemap | DONE | Live 29 Oct: complete homepage with Keep, Share, connected Discover, seven-question FAQ and signup ending; original covers and sticky header. No indexing or ranking guarantee. Live 30 Oct: root now uses permanent 308 to /home; homepage unchanged. Live 30 Oct (#67, #68): clearer site description, eighth FAQ "What is BookLog?", and FAQPage plus richer SoftwareApplication structured data (free, feature list). No visible layout change. |
| AI search visibility | Help Claude, ChatGPT, Google AI, Grok and Perplexity find and recommend BookLog | IN PROGRESS | Plan, baseline and progress log: [AI Search Visibility: Research & Action Plan](https://claude.ai/artifact/62D9QYZTyaSvdv1Y1cSePp). On-site steps done 30 Oct (description, FAQ, structured data, Brave submission). Off-site listings and X in progress. Name stays "BookLog"; use "BookLog (booklogapp.com)" on first mention in listings and intros. Re-run the AI baseline monthly. |
| AlternativeTo listing | Public BookLog listing on alternativeto.net | SUBMITTED | Submitted 30 Oct; awaiting approval. Check "My submissions" monthly. |
| X account @booklogapp | Official BookLog presence on X | LIVE | Created 30 Oct: profile, bio link and banner. Intro post live 30 Oct. Nine posts queued in Buffer (free plan, max 10 queued): every two days at 5 PM Dubai, 2–18 Nov. No links in post bodies; tags #BookTwitter #BookX on question posts. Following 8 active book accounts (incl. Reese's and Oprah's book clubs); next batch in a few days, 10–15 at a time. |
| X reply drafts | Daily drafts of replies to followed book accounts and to replies on our posts | LIVE | Scheduled task, weekdays 4:43 PM Dubai, needs the laptop on with Chrome signed in to X. Up to 3 drafts sent to phone; posts only what Pakshi approves. |

### 15. Partnerships

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| External partnerships | Book clubs, libraries, cafes, second-hand book stores | 🔲  NOT STARTED | Exploratory; no timeline or outreach approval. |
