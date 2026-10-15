# AI budget and same-spirit rows: review only

Production rollout requested. Do not merge until live preview integration and real-quality checks pass.

Draft code uses the dedicated server-only RPC secret, never a service-role key. Migration leaves the configuration disabled and creates no credential. Preview migration and secret setup are installed, disabled by default. Production remains unchanged.

All paid Ask AI and same-spirit requests authenticate the user, count final input tokens, atomically reserve worst-case cost, then settle actual usage. Unknown failed calls retain the full reservation. Automatic SDK retries are disabled. Input cap4096 tokens; Ask output2048, same-spirit output4096. Haiku4.5 pinned at $1/M input and $5/M output. Internal limits $0.45/day and $13.50/month, plus $13.50 per verified provider period and a40/day count backstop. Provider baseline and UTC-month baseline are separate. A missing/expired baseline fails closed.

Same-spirit only replaces five-star seed rows. Existing free author/genre rows remain. Server verifies seed ownership and rating, shares only catalog candidates, batches up to two misses, and binds cache publishing to paid reservation seed keys. Seven-day shared cache; 120s claim; one-hour failure cooldown. Browser filters own library/dismissals/dedupes as before. Empty/weak/failing rows hide; no generic popularity fallback.

Quality rule: exact catalog title/author and English language, descriptions for both seed and candidate, tone/style true and a specific explanation, plus at least two substantive shared-theme words corroborated in BOTH catalog descriptions. Cover required for rows. This is a conservative textual check, not a guarantee of literary relevance. Current Google failures may hide many rows before any spending. Live model review is still needed.

## Current proof

- Local full suite142/142 and type check pass.
- Local isolated PGlite SQL proof: wrong secret/direct table denial, claim ownership/expiry, reservation-seed binding, payload bounds, baseline/cap refusal, idempotent settlement, unknown reservation retained, recording in-flight usage while disabled.
- Real disposable PostgreSQL14:20 independent concurrent connections correctly enforce daily/month/provider-period budgets; one6000 reservation accepted against10000 allowance,19 denied, ledger6000. Cache claim likewise has one winner and19 busy.
- Day/month rollover fixtures retain unresolved reservations, require fresh month baseline, and keep old-month calls in a spanning provider-period budget. Anon table denial/wrong-secret checks also pass on real Postgres.
- These are local database proofs, not deployment or baseline verification on Supabase.

## Gates before becoming mergeable

1. Disposable PostgreSQL multi-connection concurrency and rollover/security validation.
2. Preview proof including existing Search/Add/Discover/Ask AI and same-spirit fixture rows, both themes. No fixture override in production code. Preview currently disables paid model calls.
3. Read current Anthropic spend, billing-period start/end, provider cap and auto-reload settings. Reconcile and seed daily/month/provider baselines without double-counting application ledger charges. Other uses of the same provider account are outside this app's caps.
4. Owner reviews the SQL migration and explicitly approves new secret setup and production execution at push time.
5. Migration applies before the code release, with fail-closed checks and rollback plan verified.
6. Approved small live-quality test allowance; inspect actual same-spirit relevance before enabling broadly.

This branch includes the taste-phrasing fix from #31, already shipped. No claim of typical calls/day is made: limits are maxima, not measured average usage.

Pricing sources inspected:
https://platform.claude.com/docs/en/models/haiku-4-5/overview
https://platform.claude.com/docs/en/about-claude/pricing

## Preview fixture proof (not relevance proof)

Test-only draft #34 reached Ready. No provider calls or database writes: two six-candidate rows rendered in light and dark, the deliberately unmatched catalog candidate was removed, client cache stored the verified candidates, and dismissal removed a card. Cap-exhausted rows and two-candidate rows both stayed hidden, with no popular fallback, in both themes. All fixture covers are deliberate stand-ins, not title/cover identity evidence.

The fixture does not establish real recommendation quality, shared-cache RPC integration with Supabase, or live coverage. Disposable Postgres validates SQL separately. Live provider/catalog integration remains gated by budget baseline, migration review and approval.

The empty-state copy now avoids promising Ask AI results while the shared budget is stopped. No production activation.

## Live preview database proof

Exact migration applied to the separate preview Supabase project. Disabled refusal, live claim/reserve/settle/publish, direct anon table/schema denial and daily-cap refusal verified. Test writes rolled back; no retained test reservations/cache. Production remains unchanged. Paid real-quality checks are still pending.

Paid preview testing requires BOOKLOG_AI_PREVIEW_TEST=enabled, staged only on this review branch. Other previews remain disabled. Preview live test budget is capped at $0.04 new charges with at most two calls; no production activation.

## Real paid preview result: HOLD

2026-10-14: authenticated Ask AI successfully counted 295 input tokens, reserved 10535 microdollars and settled actual 3815 microdollars ($0.003815), without retries. Returned The Kiss Quotient with Sally Thorne as author; Penguin Random House confirms Helen Hoang. This title/author correctness failure is a release blocker, not successful quality proof.

Same-spirit with The Secret History / Never Let Me Go produced no claims or reservations and no rows; its seed catalog precondition did not pass. Real same-spirit quality remains unproven. Preview disabled again, temporary seed books removed, original synthetic ratings restored. Ledger retained for cost accounting. Production unchanged and merge held.

Publisher evidence: https://www.penguinrandomhouse.com/books/566902/the-kiss-quotient-by-helen-hoang/


## Local correctness follow-up (October 14, not deployed)

Shared book-catalog corroboration now guards Ask output. Model title/author pairs without a verified catalog identity are dropped. Google errors, empty results, missing descriptions and identity misses are classified without recording credentials or private library titles in diagnostics. Open Library may supply an exact English edition, verified author IDs/aliases and a description bound to that edition's work. No title-only acceptance or generic-popularity fallback. Same-spirit cache version is now v2.

Unpaid live local lookup: The Kiss Quotient / Sally Thorne was rejected; The Secret History / Donna Tartt and Never Let Me Go / Kazuo Ishiguro resolved to English editions with descriptions through the fallback. Local Google returned HTTP 429 without a server key; this is not proof of the earlier preview's cause. Mocked regression tests exercise wrong authors, HTTP categories, missing descriptions and mismatched work descriptions. These changes are local only; real same-spirit generation and app rendering remain unproven.

Vercel's free daily deployment limit has stopped new previews. PR #35 cover/banner also awaits live light/dark proof. No production migration, merge or activation has occurred.
