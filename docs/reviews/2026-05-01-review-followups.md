# 2026-04-30 Review — Implementation Follow-ups

Companion to `docs/reviews/2026-04-30-codebase-review.md`. This doc records what landed on `claude/code-review-benchmark-ify8x` in the 2026-05-01 implementation pass and what is still open.

## Landed (in commit order)

- **`11a7039` — Critical (C-1..C-6).** Page-layer `getCurrentOrg()` sweep, fresh-org-per-signup in NextAuth, `getContactById`/`getCampaignById` orgId-scoped, `db.emailAccount.findFirst()` user-scoped, `getAIConfig(orgId)`, HTML-escape outreach body + allow-list font validation.
- **`e53b571` — High (H-1..H-8 except H-5).** Coverage SSRF fix at write + PDF render, MS Graph CRLF parity, `requireRole` helper + gates on settings/suppression/template-delete, manual-send atomic claim, follow-up reply check, blob keys per-org with UUID, phase `$transaction` + transition validation.
- **`6dd9cc3` — Medium (M-1, M-2, M-4, M-6, M-8..M-10).** OAuth provider scoping, dropped `style` from signature allow-list, sanitise `Reply.bodyHtml` on write, importer hard-error on missing merge target, MS Graph fallback try/catch, Gmail token-rotation persisted, contact-photo Content-Length bypass closed.
- **`0c369d1` — P0 perf (P0-1..P0-6).** `take: 500` on outreach list, `take: 1000` on contacts list, `/clients` N+1 → groupBy, dynamic-import papaparse.
- **`48edbcc` — Bugs (B-1, B-2, B-4, B-6, B-8, B-10, B-11).** Strict status enum allow-list, `allSettled` in cron, full HTML entity decode, `cancelScheduled` status gate, PDF date guard, runsheet per-row org filter, supplier-removal nulls supplierId instead of deleting line items.
- **`8761d1c` — P1 perf (P1-4, P1-5).** `suggestContacts` projection + cap, `checkForReplies` 200/tick with oldest-checked ordering.

## Deferred (still open from the review)

### Needs schema migration
- **H-5** — Cron retry storm. Add `Outreach.sendFailureCount Int @default(0)`, `lastSendError String?`, extend `OutreachStatus` enum with `failed`. Transition at N=3 with backoff. *This is now the most dangerous unfixed item:* a permanently-bad address (suppressed, malformed) still loops through claim → throw → release → claim every cron tick. The H-4 atomic claim prevents dual delivery but not the hot loop.
- **B-7** — Slug history table for renames. Schema work + redirect-map handling.
- **P1-1** — Schema indexes (`Campaign(organizationId, status)`, `Campaign(organizationId, type)`, `Campaign(clientId)`, `Coverage(organizationId, type)`).

### Needs product decision or larger refactor
- **M-5** — CSV slug-collision race (per-row insert-with-retry).
- **M-7** — In-batch dedup name fallback (semantics ambiguous).
- **M-11** — Template render escape variants (no live exploit after C-6; cleanup only).
- **M-12** — Envelope-encrypt OAuth tokens at rest.
- **P1-2** — Suppression prefetch in cron (touches send paths; defer with H-5).
- **P1-3** — Raw-SQL aggregates for `getCoverageStats` / `getClientStats`.
- **P1-6** — `loadSendableOutreach` hydrate-once-per-batch.
- **P1-7** — `unstable_cache` wrapper hoist (widespread pattern).
- **P1-8** — `bulkSend` mapLimit.
- **P1-9** — PDF response cache.
- **B-3** — Reply-quoting heuristic (`On … wrote:` greedy match).
- **B-12** — Retainer rounding (UI-format change).

### Out of scope for "implement the review"
- All ten **UI/UX** items (forms → React 19 + base-ui dialogs, onboarding, mobile nav, multi-select, URL state, design-token unification, a11y pass, reports IA). These need design discussion, not autonomous implementation.
- All eight **commercial recommendations** (Stripe billing, team invites + roles, click tracking, public newsroom, GenAI visibility cron, coverage attribution, lightweight monitoring, contact freshness). Each is sprint-sized and product-led.

## Behavioural changes worth verifying

- **C-1 + C-2 change every authenticated page load.** Every page now resolves org from session; no auto-create at the page level. Existing users without `organizationId` get a fresh org via the layout's bootstrap branch. New signups get a fresh empty org instead of being silently joined to the oldest one. Worth a manual signin / signup smoke test in `next dev` before deploying.
- **M-2 strips inline `style` from saved signatures.** Anyone whose scraped signature relied on `style="margin:0; color:#…"` etc. will see those styles drop on the next send. `color`/`size`/`face` HTML attributes still pass. Consider re-running `resolveStyle` on existing `EmailAccount` rows so they re-extract their signature with the new sanitiser.
- **H-4 cron path was almost certainly broken pre-fix.** The previous `loadSendableOutreach` filter required `claimedAt: null`, but `claimDueOutreaches` always stamps `claimedAt` first. If your cron was claiming rows then failing to send them, it's now fixed. Sanity-check sent-via-cron telemetry.
- **B-11 is a partial fix.** Removing a campaign-supplier no longer deletes line items, but two legitimately separate scopes-of-work tied to the same `(campaign, supplier)` still both get unsuppliered together. Proper fix needs a `campaignSupplierId` FK on `BudgetLineItem`.
