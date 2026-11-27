# BookLog roadmap

Synced from the canonical [BookLog roadmap](https://docs.google.com/document/d/1zfv9pcx0q24nD5AR_fSGH3q-RNXN3l3sNcoXgZyyPfo/edit).

Last synced: 27 November 2026 (sharing parts 1 to 3 live: Share button, tab and full-library links, recipients choose the shelf; Remove asks first; phone Sign out fix). This is the reviewer-readable copy. Keep it aligned with the Google Doc in the same change whenever roadmap content or status changes. The Google Doc remains the canonical feature table. No automated sync is installed.

BookLog

User Stories & Product Roadmap

booklogapp.com  ·  Last updated: 27 November 2026

## Part 1 — Live Features

### 1. Account & Authentication

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Sign up | Create an account with email and one password; names optional | ✅  DONE |  |
| Log in | Sign in securely; reading data loads automatically on login | ✅  DONE |  |
| Sign out | Securely log out from the navigation bar | ✅  DONE | 27 Nov (#104): Sign out in Settings on phones now goes to the login page; signing out clears saved account details from the device. |
| Forgot password | Request a password reset link via email | ✅  DONE |  |
| Reset password | Set a new password via the reset link | ✅  DONE |  |
| Sign in with Google | Google sign-in alongside email/password | ✅  DONE | Existing library preserved. |
| Signup confirmation | Branded email; confirmation returns signed in to library | ✅  DONE | Email verification remains enabled. |
| Email preferences | Readers choose whether to get emails about book recommendations and new features | ✅  DONE | Live 23 Nov (#91). Unticked checkbox at email signup; inside the welcome survey for new Google sign-ups; a one-time card for everyone else; Settings switch. Every choice logged with the exact wording, source and time. On the list only with an explicit yes and no unsubscribe since. No email is sent by this release. |

### 2. Book Search & Adding Books

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Search for books | Search by title or author via Google Books API; shows cover, title, author, summary | ✅  DONE | Retry once, then Open Library fallback; short outage circuit breaker. Mobile search and manual entry available. |
| Add books to collection | Add from search results to any reading status with one click | ✅  DONE |  |
| In your library badge | Search results show 'In your library · [Status]' if book already exists; opens in view mode | ✅  DONE |  |
| Duplicate guard toast | Warn if a book already exists in the library | ✅  DONE | Inline message and View existing book. |
| Manually add a book | Add books not in Google Books by typing details manually | ✅  DONE | Title, optional author, status including Recommended; rating prompt and blank-only enrichment. |
| Scan barcode to add | Use phone camera to scan a book barcode and add it instantly | ✅  DONE | Camera or typed ISBN with search/manual fallback. Real phone-camera owner test remains pending. |
| First-book help | Empty-library search prompt and dismissible starter titles | ✅  DONE | Starter titles disappear as the shelf grows. Live 3 Nov (#77): empty shelf also shows "Coming from Goodreads? Import your library", linking to the import card in Settings. |
| Cover photo to add | Identify a book from a cover photo | CANDIDATE | Not built. Paid fallback after barcode value is proven; confirm match. |

### 3. Reading Status & Organisation

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| 5-status library | Reading, Queued, Completed, My Recommendations, On Hold | ✅  DONE |  |
| Move books between statuses | Three-dot menu to change status on any book | ✅  DONE |  |
| Completed + Recommendations overlap | Books can exist in both Completed and My Recommendations simultaneously | ✅  DONE |  |
| Delete books | Remove any book using the trash icon | ✅  DONE | 27 Nov (#104): asks "Remove this book?" first. On Recommendations, Remove only takes the book off that list. |
| Genre tags + filtering | Tag books with genres; filter library by genre pill | ✅  DONE | Genre filtering live; broader reader-defined tags remain a requirement. |
| Star ratings | Rate completed/recommended books 1–5 stars; persists across status changes | ✅  DONE |  |
| Personal notes | Write notes against any book in your library | ✅  DONE | Typed notes live; dictation belongs to planned voice commands. |
| Pagination | Large libraries paginated on My Books and public profile | ✅  DONE |  |
| Track reading dates | Record start and finish dates per book | ✅  DONE | Month/year with optional exact day for start/finish; editable dates on Reading books; finish plus rating on Completed/Recommended adds and moves. |
| Edit book details | Edit title, author, or cover image of any book | 🟡  PARTIAL | Title, author and dates editable. Blank cover/description enrichment is live; manual cover upload not built. |
| Star / favourite a book | Mark all-time favourites with a star for quick reference | 🔲  NOT STARTED | Not built; Recommendations star is not a favourite. |
| Sort books | Sort by date added, title, author, or rating | 🔲  NOT STARTED | Parked by the owner. No sort control in the app. |
| Within-library search | Search within your own collection by title or author | ✅  DONE | Title/author filter above each list. |
| Library load recovery | Parallel books/notes reads, clear loading state and safe Retry. Live 29 Oct 2026; saved libraries unchanged. | ✅  DONE |  |
| Metadata and duplicate safety | Fill missing details only; latest-edition results; near-duplicate warning | ✅  DONE | Never overwrite entered details or block Add anyway. |
| Fill details when a book is opened | Opening your own book with no description or cover looks it up once and fills the blanks (also genre and year if empty) | ✅  DONE | Live 3 Nov (#76). Fill-only, never overwrites. Server-side lookup with the server Google Books key; at most once per book every 6 hours. Applies to any book missing details, not only imports. |
| Did Not Finish | Separate a stopped book from On Hold | CANDIDATE | Not built; no build approval. |
| Reading progress check-in | Page or % progress on Reading books, with what is left; Finished? from 90%; What's next? after finishing | ✅  DONE | Live 19 Nov (#89). Reading cards (grid and list) show a bar, "37% · 239 left" and Update; no progress shows "Update progress". Check-in ("How much have you read?"): Page or %, last value prefilled, total pages prefilled from Google Books / Open Library and editable (a typed total is never overwritten). From 90% Update becomes Finished?: Yes uses the existing finish dialog, Not yet opens the check-in. After finishing, a one-time What's next? box on Reading reuses Up next, the queue shuffle, the Queued tab or Discover. Reading cards show only the start date (an earlier finish date stays stored). Check-ins clear when a book leaves Reading/On Hold. Measured: progress.updated (DB), progress.opened, progress.total_from_lookup, finish.offered/opened/choice, next.shown/started/change/open_queue/open_discover/dismissed. |
| Weekly reading reminder | Opt-in weekly email for a book being read, linking to the check-in | 🔜  PLANNED | Release 2 of the check-in. Explicit unticked opt-in on the current-book card, onboarding and Settings; consent recorded for this message type only (Resend policy). No opt-in email to existing readers. Growth plan (23 Nov): design confirmed 10 Dec, built on preview 11 Dec; tested 14 Dec for delivery, unsubscribe, duplicate sends and consent for this email type; release decision 15 Dec. |
| Reading journal | Dated notes alongside progress | CANDIDATE | Not built; no build approval. |
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
| Discover loading and recovery | Keep prior rows while loading; Retry on failure | ✅  DONE | Failures retry after an hour; honest no-match state. |
| Cross-device Discover history | Sync Discover history between devices | NOT STARTED | Current session history is device-local. |
| Paid same-spirit generation | Broader paid recommendations with cache and budget controls | PARKED | Draft only; production disabled. Quality not validated; new test/spend approval needed. |
| Discover shelf-change control | Change shelf for an existing book from Discover details | CANDIDATE | Not approved; new books already support Add to Collection. |
| Welcome chooser | Optional taste questions for new accounts without personal rows | ✅  DONE | Eligible accounts created from 25 October noon Dubai; Skip/answered never again. |
| Discovery filters | Mood, pace, length and sourced content-warning filters | CANDIDATE | Not built; metadata coverage must be verified. |
| Newsletter discovery | Find books from reader-selected newsletters | CANDIDATE | Not built. Review queue first proposed; ratings coverage, permissions and notifications unresolved. |

### 6. Profile & Settings

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Account settings | View and update profile information | ✅  DONE |  |
| Public profile /u/[username] | Shareable reading profile at a public URL | ✅  DONE |  |
| Profile visibility toggle | Control whether your profile is public or private | ✅  DONE |  |
| Update name and username | Edit display name and username from settings | ✅  DONE |  |
| Granular sharing settings | Control which tabs or statuses are visible on public profile | 🟡  PARTIAL | Public/private plus Recommendations-only or full-library profile live; per-tab profile controls not built. Share links cover sharing chosen tabs (26 Nov). |
| Profile picture / avatar | Upload and display a profile avatar | 🔲  NOT STARTED |  |
| Share individual books | Named snapshot links with quiet sharing controls | ✅  DONE | Live 26 Nov (#101): one Share button in book details; popup with Copy link and WhatsApp; the reader picks the shelf. Display name, title, author and cover only; no notes or ratings. Persistent links without expiry or revoke. |
| Share tabs or full library | Share chosen tabs or the full library with one link; untick any book | ✅  DONE | Live 26 Nov (#102, #103), simplified 27 Nov (#104). Never includes On Hold, notes or ratings. Readers open it without signing in, tick books, sign up or sign in (Google included) and choose the shelf. Link preview shows the BookLog tile and "[name] has shared this with you on BookLog". |
| Feedback form | Send feedback with a reply-to address | ✅  DONE |  |
| Privacy notice | Public notice linked from home, login and signup | ✅  DONE |  |
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
| Reading statistics dashboard | Total books read, avg per month, favourite genres, most productive months | ✅  DONE | Live 4 Nov (#79): Stats tab in the sidebar and as the fifth phone tab; read-only. All-time books finished, top genre (only when one clearly leads), average rating with rated and not-yet-rated counts, authors read, top genres, and authors you returned to (else top-rated books). Under 5 finished books: starter card with Goodreads import. Opens from /books?section=stats. Release 2 (#82): "Authors you returned to" needs 2+ repeat authors, else your five-star books, 4 a day in rotation when there are more than 4. |
| Monthly / yearly reading summary | Visual summary of books read by month and year | ✅  DONE | Live 4 Nov (#82): month and year charts with a [year] / All time switch, shown once a reader has 5+ finished books with dates (replaces the dates card); counts finish dates only, never date added. Fill in the gaps (inside Stats) lists finished books missing a finish date or a rating and fills only those blanks, using the existing save code. |
| Reading streaks | Optional reading-day log, separate from next-read choice | MOCKUP ONLY | No inferred history, required pages/timer/journal or lost-streak warning. No build approved. |
| Annual reading goal | Set a target number of books for the year and track progress | ⛔  EXCLUDED | Excluded; associated goal-pace notifications also excluded. |
| Choose your next read | Search Queued books and keep one chosen intention | ✅  DONE | One Queued book, saved privately. Change or clear; Start reading separate. Clears on start, move or delete. Other tabs may need refresh. |
| Queue shuffle | Show one queued book at a time, with one tap to make it the next read | ✅  DONE | Live 5 Nov (#85): "From your queue" card at the top of Queued, only with 3+ queued books and no next read chosen. Unlimited shuffles, no repeats until the whole queue has been shown. Tap the cover or title for book details. Make it my next read uses the existing next-read save; Change stays the manual list. Measured: queue.shuffle_shown, queue.shuffled, queue.shuffle_details, queue.shuffle_next_read (saved query 8). |
| Ordered next-read shortlist | Manually prioritize several queued books | CANDIDATE | Not built; distinct from the accepted one-book intention design. |
| Year in Books share card | One image per reader with books finished, pages, top genre and best-rated book, made to share | 🔜  PLANNED | Growth plan (23 Nov). Built on Stats and the monthly/yearly summary. Mockup 30 Nov, build 7 Dec, release decision 10 Dec. Real finish dates only (never date added); tested on sparse and full libraries. No reading goal on the card while Annual reading goal stays excluded. |

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
| Goodreads import | Import reading history and library from Goodreads with one click | ✅  DONE | Live 3 Nov (#75). Settings › Your data. Goodreads CSV export: read → Completed only, currently-reading → Reading, to-read → Queued, other shelves → On Hold; ratings, read dates and reviews (as private notes). Shows a summary before saving; Stop button. Only adds books; existing ones are left untouched; safe to re-run. Covers from Open Library (no Google Books quota); uncertain genres left blank. Descriptions fill when a book is opened (#76). Empty-shelf link (#77). Up to 1000 books per import and 1000 rows per library. |
| Export reading list | Download entire collection as CSV or PDF | 🟡  PARTIAL | CSV is live (Settings, Your data). PDF is not built. |
| Other imports | StoryGraph / standard CSV / Bookcase / Amazon import | PARKED / CANDIDATE | Not built; review and reconciliation required. |

### 11. Notifications & Reminders

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| Custom SMTP via Resend | Transactional emails routed through Resend for reliability | PARKED | Current branded confirmation works; custom sender not needed now. |
| Reading reminders | Daily or weekly reminder to read via email or push notification | 🔲  NOT STARTED | Opt-in only; no annual-goal pace warnings. |
| New book alerts | Notify when a favourite author releases a new book | 🔲  NOT STARTED |  |
| In-app notifications | Explain background book additions and other opt-in updates | NOT STARTED | Needed before automated newsletter additions. |
| Monthly recap email | Monthly email to opted-in readers: what they read and what is next | CANDIDATE | Opted-in readers only (email preferences, 23 Nov). Owner decision 13 Jan. |
| First-book nudge email | One email 24 hours after signup to an opted-in reader with no books yet | CANDIDATE | Reviewed, not built automatically, if 7-day activation of eligible new signups falls below 60%. Nov: 4 of 5 eligible added a book within 7 days, 7 pending. |

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
| Auto-post to Instagram | Auto-post to BookLog Instagram via Graph API | 🔜  PLANNED | Phase 3 of Social Content Tool. Interim from 2 Nov: hand-made posts scheduled in Buffer (see Instagram account row). |
| Auto-comment on book posts | 2–3 daily comments on relevant posts on X and Instagram | 🔜  PLANNED | Not launched; separate approval required. Interim from 30 Oct: approval-gated reply drafts on X and Instagram (see Social reply drafts row). Fully automatic replies not advised: X treats automated replies as spam. |
| Public web discovery | Server-rendered homepage, metadata, canonical and public sitemap | ✅  DONE | Live 29 Oct: complete homepage with Keep, Share, connected Discover, seven-question FAQ and signup ending; original covers and sticky header. No indexing or ranking guarantee. Live 30 Oct: root now uses permanent 308 to /home; homepage unchanged. Live 30 Oct (#67, #68): clearer site description, eighth FAQ "What is BookLog?", and FAQPage plus richer SoftwareApplication structured data (free, feature list). No visible layout change. |
| AI search visibility | Help Claude, ChatGPT, Google AI, Grok and Perplexity find and recommend BookLog | IN PROGRESS | Plan, baseline and progress log: [AI Search Visibility: Research & Action Plan](https://claude.ai/artifact/62D9QYZTyaSvdv1Y1cSePp). On-site steps done 30 Oct (description, FAQ, structured data, Brave submission). Off-site listings, X and Instagram in progress. Name stays "BookLog"; use "BookLog (booklogapp.com)" on first mention in listings and intros. Re-run the AI baseline monthly. |
| AlternativeTo listing | Public BookLog listing on alternativeto.net | ✅  DONE | Live 24 Nov (approved about an hour after priority review was paid). Submitted 30 Oct. 24 Nov: listing updated (Goodreads import first, Stats, tags goodreads-import and reading-statistics) and priority review paid ($15); review usually within 1 to 2 business days. Next: developer access requested 25 Nov; then remove the domain from the description, sharpen the opening, add features Goodreads import and Reading statistics; link the Goodreads-alternative page once released. First likes from real readers only. |
| X account @booklogapp | Official BookLog presence on X | ✅  DONE | Created 30 Oct: profile, bio link and banner. Intro post live 30 Oct. Nine posts queued in Buffer (free plan, max 10 queued per channel): every two days at 5 PM Dubai, 2–18 Nov. No links in post bodies; tags #BookTwitter #BookX on question posts. Following 8 active book accounts (incl. Reese's and Oprah's book clubs); next batch in a few days, 10–15 at a time. Growth plan (23 Nov): Buffer queue ran out 18 Nov; refill 27 Nov, Year in Books share-card posts from 22 Dec. |
| Instagram account @booklog_app | Official BookLog presence on Instagram | ✅  DONE | Created 2 Nov (booklogapp was taken). Creator account, category App Page, public. Bio carries booklogapp.com as text; clickable link needs the mobile app (not set). Six branded image posts queued in Buffer (second channel), every two days at 5 PM Dubai on non-X days, 3–13 Nov; 3 hashtags each, no book-cover artwork. Following 9 active book accounts (incl. Reese's, Oprah's and Read with Jenna clubs). Next follow batch to lean towards individual Bookstagrammers. Growth plan (23 Nov): Buffer queue ran out 13 Nov; refill 27 Nov, Year in Books share-card posts from 22 Dec. First Bookstagram feedback DMs sent 19 Nov (see Bookstagram reader outreach). |
| Social reply drafts (X + Instagram) | Daily drafts of replies to followed book accounts and to replies or comments on our posts | ✅  DONE | Scheduled task, weekdays 4:43 PM Dubai; Instagram added 2 Nov. Needs the laptop on with Chrome signed in to X and with booklog_app as the active Instagram account. Up to 3 drafts per platform sent to phone; posts only what Pakshi approves. |
| Feature usage tracking | Record which features readers use, so every feature can be measured | ✅  DONE | Live 4 Nov (#83). Every reader action is recorded: adding, moving, removing, rating, dating and editing books, notes, next read, import, export, theme, sharing books and profiles, Discover, Stats, barcode, Amazon links, and daily opens. Never records note text, search words, Ask AI requests, names, titles or email. Saves can't fail because of it. Owner-only access. Privacy notice updated the same day. Saved queries: docs/usage-queries.sql. |
| Goodreads-alternative page | Public landing page at /goodreads-alternative that leads with Goodreads import (CSV export, review, save) | ✅  DONE | Live 25 Nov (#100), pulled forward from the 26 to 30 Nov dates. Growth plan (23 Nov). Outside the app nav; small link in the home page footer. Mockup approved 24 Nov (year removed). Preview test passed 25 Nov (Instinct). Home footer links stay at their current size for now. In the sitemap and open to crawlers; landing page recorded with the signup source. Linked from Reddit replies, AlternativeTo and launch posts. |
| Launch week | Product Hunt, Show HN and r/SideProject on separate days | 🔜  PLANNED | 5, 6 and 7 Jan 2027. Kit drafted 16 to 18 Dec, dry run and capacity check 30 Dec, go or no-go 31 Dec (no go means hold). Routine work paused on launch days; launch-cohort activation read on 14 Jan. |
| Reddit participation | Genuine replies in reading communities, with occasional posts where the rules allow | IN PROGRESS | Setup 25 Nov; from 26 Nov, 30 minutes each weekday except 2 to 4 Dec, 1 Jan and launch days 5 to 7 Jan: r/52book, r/suggestmeabook, r/goodreads, r/books. Read each subreddit's rules first. |
| Personal network post | LinkedIn post and WhatsApp groups about BookLog | 🔜  PLANNED | 27 Nov, only after the source-capture test passes; with UTM links. |
| Bookstagram reader outreach | Feedback requests to individual Bookstagrammers, approved by the owner before sending | IN PROGRESS | First 3 DMs 19 Nov, no replies logged yet. Batches of about 10 on Tuesdays from 8 Dec; kept after 11 Jan only if it is one of the 2 best channels. |
| Growth tracking | UTM links per channel and a Growth tab on the metrics dashboard | IN PROGRESS | Signups by source, 7-day activation, weekly active readers, week-1 return, signup drop-offs. Source capture live 24 Nov (#99), counting accounts created from 24 Nov 19:00 Dubai: first tagged visit remembered in the browser for 30 days (referring domain only), sent with email signup, and one account.source event on a new account's first My Books visit (email or Google); no tag means unknown, a referrer alone never sets the source. UTM links point at /home, because the root redirect drops query strings. Preview test passed 24 Nov (email tagged, untagged, sign-in again, root link); Google path not run on preview, check the first real Google signup. Growth tab 25 Nov. Reviewed every Monday; cohorts under 7 days shown as pending. Saved query: docs/usage-queries.sql #9. |

### 15. Partnerships

| Feature | Description | Status | Notes |
| --- | --- | --- | --- |
| External partnerships | Book clubs, libraries, cafes, second-hand book stores | 🔲  NOT STARTED | Exploratory. Growth plan (23 Nov): contact 2 or 3 Dubai book clubs from 9 Dec, only with owner approval. |

### 16. Stats decision log

| Date | Decision | Why (rationale and data) |
| --- | --- | --- |
| 3 Nov | Build Stats next. | Goals: more users, adoption, stickiness. Goodreads import (live 3 Nov) brings years of history; Stats pays that back on day one and changes as readers finish books. Read-only, so lowest regression risk. Year-end is when readers look back. Deferred: PWA (offline caching can serve an old app version), reading reminders (need the parked email sender), friends/social (bigger scope, privacy and moderation). |
| 3 Nov | Name it Stats; page heading "Your reading life". | Short enough for the phone tab bar; the heading carries the warmer wording. |
| 3 Nov | Phone: Stats is a fifth bottom tab (Option A). Option B, a link card on My Books, is parked. | Stats is a return-visit page, and five tabs is a normal maximum. Keeps My Books uncluttered. Reversible: the page has its own address (/books?section=stats), so the tab can move later without breaking links. Move to Option B if a new feature needs the tab space more. |
| 3 Nov | Lead with all-time stats; month/year charts only once a reader has 5+ finished books with dates. Never use date added as a stand-in for date finished. | Live data 3 Nov: 322 finished books across 30 readers; 9 had a finish date, 171 a rating, 318 a genre. 14 readers had 5+ finished books; 0 had 5+ dated ones. Date added would look precise but be wrong for readers who added years of books on day one. |
| 3 Nov | Ship in two releases: Release 1 read-only, Release 2 adds Fill in the gaps (writes) with its own testing. | A problem in the part that writes data can't affect what is already live. |
| 4 Nov | Below 5 finished books, show a starter card (Finish N more books, Import from Goodreads) instead of genres and authors. | Near-empty charts and lists read as broken. 5 matches Discover's threshold for rated rows. |
| 4 Nov | Dates card: five dots, one per finished book with a finish date; disappears at 5. | Shows exactly how close the reader is to the month/year view. |
| 4 Nov | Only two reminders on Stats: the dates card and a ratings line. Ratings line shows only while under half of finished books are rated. No start-date reminder. | Keep the page minimal. A line that shows whenever one book is unrated would nag forever for big imported libraries. Nothing on Stats uses start dates. |
| 4 Nov | Rating tile sub-line reads "31 rated · 27 not yet rated" ("All N rated" when complete). | "31 of 58 books rated" read as if Stats had picked 31 books, and hid the 27 the reader could still rate. |
| 4 Nov | Import from Goodreads goes to the import card in Settings (scrolls to it), not straight to a file picker. | Browsers only open a file picker from a click on the same page. Readers need the export instructions first. One import place to maintain. |
| 4 Nov | Top genre tile only when one genre clearly leads: 2+ books and no tie for first. Otherwise hidden; Top genres still lists them all. | Preview showed "Business · 1 of 5 books" when Business and Fiction tied at 1 and Business won alphabetically. Imports leave uncertain genres blank, so ties are common at first. |
| 4 Nov | Release 1 shipped without the charts the dates card mentions. | Release 2 ships the same day, and almost no reader can reach 5 dated books before then. |
| 4 Nov | Release 2: "Authors you returned to" only when 2+ authors have 2+ finished books; otherwise top-rated books. | Owner's live library: 30 finished books by 29 authors, one repeat (Brad Stone). A one-row card looks empty, and varied readers will be common. |
| 4 Nov | Release 2: top-rated books rotate daily (4 at a time, same set all day) when more than 4 share the top rating. | Owner has 24 five-star books, 21 also on My Recommendations and only 4 dated, so no fixed order is meaningful. Date added isn't passed to the screen, and passing it means changing the code that loads every library. Rotation also gives a small reason to come back. |
| 4 Nov | Every action a reader takes is measurable: adding, moving, rating, dating, editing and deleting books, notes, import, export, theme, sharing books and profiles, Discover, Stats and every other button. Every new feature ships with its actions recorded. | No usage is recorded today: the old activity table has had no writes since May 2025, so we can't tell how many readers used Goodreads import, sharing, export or Stats. Features should be judged by real use. Plan: claude/usage-tracking-plan.md. |
| 4 Nov | Roadmap statuses: finished rows say ✅ DONE in green; no LIVE or plain DONE. | One consistent status for finished work makes the roadmap quicker to scan. |
| 4 Nov | Usage tracking live. Privacy notice leads with how the records make BookLog better, in plain words. | Owner asked for milder wording that starts with the reader benefit. Same promises kept: no notes, searches or Ask AI requests; never shared with advertisers. Live data identical before and after the change (fingerprints of books, notes, next read, shares and profiles matched). |
| 5 Nov | Build queue shuffle next (proposed by Instinct). Change on Up next stays the manual list. The card shuffles the whole queue and ignores genre filters and search. | Live data 5 Nov: 9 of the 11 signups in the last 30 days added books, and 59 of the 61 accounts with no books are older than 30 days, so getting new readers started is no longer the main leak; keeping readers coming back is. 179 queued books across 15 readers, and nothing brought older ones back into view. StoryGraph readers single out random to-read reminders as a favourite. In-app and read-only apart from the existing next-read save, so low regression risk. Change stays the manual list: a reader tapping Change usually has a book in mind, and the live next-read feature stays untouched. |
| 19 Nov | Build a reading progress check-in (Release 1), then an opt-in weekly reminder (Release 2). No streaks. | Agreed by Instinct and Claude from BookLog data, competitors and public research. Since tracking began (4 Nov) 30 readers have a book on Reading but only 2 came back; 16 of 19 recent adders added books on a single day. Goodreads, StoryGraph and Bookly all offer page or % progress, so it is expected; no published benchmark shows its retention effect, so it is a product decision, judged by distinct-day check-ins and weekly return. |
| 19 Nov | No opt-in request email to existing readers; reminders need explicit, unticked opt-in inside the app. | Resend's policy requires explicit opt-in per message type; signup never collected it. Readers who no longer visit cannot be reached; stated plainly. Verdict on the reminder will take about 2 to 3 months. |
| 19 Nov | Keep both Page and % (Page default); fill total pages from public data, editable. | Kindle shows % or location, not pages. Preview check: 3 of 3 books got a total automatically. 65 of 75 books on live Reading shelves have a Google Books id. |
| 19 Nov | From 90%, Update becomes Finished? (two-button choice) instead of adding a link. | Keeps every card footer at two lines on phones (Instinct's congestion review). Costs one extra tap for a reader not yet done. |
| 19 Nov | What's next? appears only after finishing through Finished?; card-menu moves to Completed unchanged. | Reuse existing parts, no change to current flows. Widening it is a separate decision. |
| 19 Nov | Reading cards hide an earlier finish date (display only). | A progress bar next to "Finished" contradicted itself. Clearing stored dates would delete reader data. Agreed by Instinct and Claude at the owner's request. Live data identical before and after the release (books fingerprint matched). |
| 19 Nov | Wording: "Update progress" on a card with no check-in yet; check-in title "How much have you read?". Copy only (#90). | Owner-approved wording, plainer than "Where are you up to?". Short "Update" stays beside an existing progress bar. Verified on preview by Instinct. |
| 23 Nov | Collect explicit email consent in the app: unticked checkbox at signup, one-time card for existing readers, Settings switch. | Signup never asked, so no reader email could be sent. A pre-ticked box or pre-selected Yes is not valid consent (UK GDPR / ICO; UAE PDPL). "Yes, email me" is the main button on the card (owner's call). Closing the card is not consent and it is not shown again; Settings is the way back. |
| 23 Nov | New Google sign-ups get the email checkbox inside the existing welcome survey, not a separate step. | One popup instead of two. Off by default, so the survey is unchanged for everyone else; answers save first exactly as before. |
| 23 Nov | Growth plan to 1,000 accounts by 31 Jan 2027: lead with getting signups and reasons to return; no new onboarding screen. Owner time about 1.5 to 2 hours a weekday; at most two time-heavy channels at once; 500 to 600 accounts counts as a win. | New signups adding a book within 7 days (owner and test accounts excluded, full 7-day window): Aug 3 of 17, Sep 4 of 17, Oct 7 of 11, Nov 4 of 5 eligible (7 pending), so activation is no longer the main gap; accounts with no books are mostly older. First-book help and Welcome chooser already cover onboarding. Annual reading goal stays excluded unless reopened. |
| 26 Nov | Sharing: one Share button for a book, a tab or the whole library (Recommendations, Reading, Queued, Completed; never On Hold). Links are fixed at share time: books removed later drop off, books added later never appear. Old profile links stay as they are; the public/private switch stays in Settings. | Agreed board by board with the owner before building (9 mock-up boards). Fixed links show exactly what was shared. Released in parts; Instinct tested each preview on synthetic accounts, and production database changes ran only on the owner's direct go. |
| 26 Nov | Readers pick the shelf when adding a shared book, and can add several books from one link after signing up or signing in, Google included. | Owner's decision (board 5): the reader decides which shelf a shared book goes to. Google sign-in from a share link needed one added return address on production (approved 26 Nov). |
| 27 Nov | Share popup simplified (no saved-choice note, no preview card, one privacy line); phone bottom tab reads Settings; Remove asks first, and on Recommendations only takes the book off that list. Unused share links are kept for now. | Owner's phone review. The saved-choice note could contradict the current choice and the preview card was cut off. The tab sometimes showed the email prefix. A stray tap deleted a book with its notes. Unused links are small rows looked up by their code; revisit only if they grow enough to cost money or slow the app. |
