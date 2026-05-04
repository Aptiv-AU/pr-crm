# Codebase Review — 2026-04-30

Post-Sprint-2 review covering security, performance, correctness, UI/UX, and competitive positioning. Five specialised reviewers ran in parallel against `claude/code-review-benchmark-ify8x` (HEAD `cac685b`). Findings consolidated by severity. File:line references are authoritative.

## Executive summary

Sprint 2's hardening landed. The previous review's headline finding (S-1 — every server action acted on whatever org `findFirst()` returned) is real-fixed at the action layer: `requireOrgId()` is in, OAuth tokens are bound to the session user, Gmail headers are CRLF-stripped, cron secrets fail closed, and signature/photo XSS+SSRF surfaces are mostly handled. The action wrapper, the org-cache, the Field primitive, the parallelised reply-check cron, and the CSV import batching are all genuine quality wins.

But **the same systemic class of bug moved one layer up.** Every page route under `src/app/(app)/**` resolves "the org" via `db.organization.findFirst()` at render time — bypassing the session and ignoring the `getCurrentOrg()` helper that already exists for this purpose. The exact same cross-tenant exposure is present, just on the read paths instead of the write paths. NextAuth's `createUser` event auto-attaches every new signup to the first org it finds. `getAIConfig()` reads the same `findFirst()` pattern, so AI provider selection silently routes to whichever org is at the top of the table.

That single class of bug is the dominant finding of this review. **Three of the four code-level audits independently surfaced it** — security flagged it as Critical (C-1 through C-5), correctness as Bug-blocking #1, performance as P0-4. Fixing it is mechanical: replace every `db.organization.findFirst()` outside the auth flow with `getCurrentOrg()`. The same change closes 5 Critical security findings, the dominant correctness bug, removes a wasted point read on every page render, and removes the silent auto-create-org footgun.

After that pass, the rest is a long tail of well-understood mediums: a stored-XSS path through `renderOutreachHtml`, an SSRF path through coverage attachment URLs (the photo SSRF was fixed; coverage attachments use the same regex-only validation pattern that was broken before), a manual-send race that can dual-deliver, a follow-up generator that doesn't notice the contact already replied, unbounded list pages on `/contacts` and `/outreach`, and a form layer that's still pre-React-19.

The competitive picture is more positive than two weeks ago. Sprint 1+2 erased nine of thirteen "missing" items from the 2026-04-17 snapshot. Pressroom has crossed from "demo-ready" to "sellable except for billing." The two remaining commercial blockers — Stripe billing and team invites/role enforcement — are both Sprint-sized projects, and shipping them gets the product into a niche (boutique-agency PR CRM under $200/mo with retainer cadence and event production) where only Propel and Prezly compete and neither has the multi-client workspace model.

**Top 5 in strict order:**

1. **Page-layer tenant scoping** (Critical security + correctness). Replace every `db.organization.findFirst()` under `app/(app)/**` and `src/lib/ai/get-config.ts` with `getCurrentOrg()`. Add `organizationId` filters to `getContactById`/`getCampaignById` and the unscoped `db.emailAccount.findFirst()` call sites. Fix `src/lib/auth.ts:18-30` so signups don't auto-join the oldest org. Closes C-1 through C-5 and Bug-blocking #1, #2.
2. **Stored XSS in `renderOutreachHtml`** (High security). HTML-escape `body` before paragraph wrapping; validate `fontFamily`/`fontSize` against a strict regex. Outgoing pitches are currently injectable.
3. **SSRF via Coverage attachment URLs** (High security). Apply the same `assertPublicHost` pipeline used for contact photos to coverage `attachmentUrl` at write *and* at PDF render. Today the regex-only `(jpg|png|gif|webp)` extension check lets `http://169.254.169.254/...png` through.
4. **Manual-send race + cron retry storm** (Bug-blocking). Atomically claim outreaches in `loadSendableOutreach` (current `claimedAt: null` check is read-only); add a failure counter with terminal state in `send-scheduled` so a permanently bad address doesn't loop forever.
5. **Stripe billing + team roles** (Commercial). Last blockers between the current product and revenue. Both unblock the multi-client workspace pitch.

Everything below is meaningful but not urgent.

---

## Critical

### C-1. Page-layer tenant isolation is bypassed everywhere
**Severity:** Critical — multi-tenant blocker  
**Files:** `src/app/(app)/contacts/page.tsx:12`, `contacts/[contactId]/page.tsx:22`, `campaigns/page.tsx:12`, `campaigns/[campaignId]/page.tsx:24`, `clients/page.tsx:93`, `clients/[clientId]/page.tsx:25`, `suppliers/page.tsx:8`, `suppliers/[supplierId]/page.tsx:20`, `coverage/page.tsx:8`, `outreach/page.tsx:8`, `events/page.tsx:8`, `events/[campaignId]/page.tsx:22,53`, `settings/page.tsx:12`

Every page resolves the active org with `db.organization.findFirst()` and ignores `session.user.organizationId`. With more than one org row in the DB, every authenticated user sees the first-inserted org's contacts, campaigns, suppliers, coverage, outreach. The `getCurrentOrg()` helper exists, is cached, and is already used by `(app)/layout.tsx` — child pages just don't call it.

**Fix:** sweep-replace `db.organization.findFirst()` → `await getCurrentOrg()` in every page; delete the inline auto-create-org branch.

### C-2. NextAuth `createUser` joins every new signup to the first org
**Severity:** Critical — multi-tenant blocker  
**File:** `src/lib/auth.ts:18-30`

`createUser` does `db.organization.findFirst()` and assigns the new user to it. There's no invitation flow, no email-domain check, no role assignment beyond the schema default `"owner"`. Any visitor who completes magic-link signup is silently added to whichever org is oldest in the DB and immediately has full read access (and, via the action layer's existing org scoping, full *write* access).

**Fix:** auto-create a fresh org per signup. Require an explicit invite token to join an existing org. Make `User.organizationId` non-nullable.

### C-3. `findUnique` without org filter on attacker-controlled CUIDs
**Severity:** Critical — IDOR  
**Files:** `src/lib/queries/contact-queries.ts:32` (`getContactById` → `getContactByIdCached`), `src/lib/queries/campaign-queries.ts:42` (`getCampaignById` → `getCampaignByIdCached`)

Both queries take `id: cuid` and never filter by `organizationId`. The slug branch in the parent page does scope by org (poorly — see C-1), but the cuid branch bypasses scoping entirely. Any user with any contact/campaign CUID gets the full record including outreaches, coverages, join rows.

**Fix:** convert both to `findFirst({ where: { id, organizationId } })`. Pass `orgId` from `getCurrentOrg()` at the page layer.

### C-4. `db.emailAccount.findFirst()` with no scoping
**Severity:** Critical — cross-tenant info leak + tenancy correctness  
**Files:** `src/app/(app)/campaigns/[campaignId]/page.tsx:54`, `src/app/(app)/settings/page.tsx:33`, `src/app/(app)/settings/email/page.tsx:13`

Returns "the first email account in the entire database" to drive the campaign page's "send via Gmail/Outlook" UI state. On a multi-tenant deployment this surfaces another user's email address and, worse, `requireEmailAccount` (`outreach-actions.ts:447-453`) — which does scope by org — will pick *its* first match too, so an org with two connected mailboxes can't predict which one a given send will use (also Bug-likely #30).

**Fix:** scope to `user.organizationId` everywhere; eventually attach outreach drafts to the mailbox of the user who created the draft.

### C-5. `getAIConfig()` reads `organization.findFirst()`
**Severity:** Critical — silent provider hijack across orgs  
**File:** `src/lib/ai/get-config.ts:12-29`

Pitch generation (`api/generate-pitches/route.ts:47`) and contact suggestion (`outreach-actions.ts:225`) correctly call `requireOrgId()` for the campaign/contact lookups, but the *AI provider selection itself* is keyed off the first org's row. Org B's "use OpenAI" preference is silently overridden to Org A's choice, AI key environment variables get cross-routed, and a misconfigured Org A breaks pitch generation for everyone else.

**Fix:** `getAIConfig(orgId)` accepts the org id from the caller (or calls `requireOrgId()` itself).

### C-6. Stored XSS in `renderOutreachHtml`
**Severity:** Critical — outgoing email + in-app preview  
**File:** `src/actions/outreach-actions.ts:455-474` (also Bug-blocking #9)

`body` is split on `\n\n+`, wrapped in `<p>...</p>`, and concatenated into the email. Body text is never HTML-escaped, so a body containing `</p><script>...</script><p>` produces a sent email with live HTML; `<img src=x onerror=...>` and CSS expressions also land. Most webmail clients strip `<script>` but image-error handlers and CSS payloads survive. `fontFamily` and `fontSize` come from `EmailAccount` columns set by `setManualSignature` (`email-style-actions.ts:31-46`) without sanitisation — an account owner can store `Arial; "><script>...</script><div x="` and inject into every outgoing pitch. Same surface in the in-app preview.

**Fix:** HTML-escape `body` before paragraph wrapping. Validate `fontFamily` and `fontSize` against an allow-list regex with a length cap. Same defence on `extractFontStyle` (`src/lib/compose/extract-signature.ts:9-22`) since the source HTML it scrapes can be attacker-controlled if the user's sent items include a malicious reply (M-3).

---

## High

### H-1. SSRF via `Coverage.attachmentUrl` rendered server-side by `@react-pdf/renderer`
**Files:** `src/app/api/reports/[campaignId]/route.ts:117-128`, `src/lib/pdf/campaign-report.tsx:258-265`, `src/actions/coverage-actions.ts:39-72`

Photo SSRF (S-6e) was fixed. Coverage attachments weren't — the same vulnerability shape was overlooked. `attachmentUrl` is stored unvalidated; the PDF render gates on a regex-only `\.(jpg|jpeg|png|gif|webp)(\?|$)` check. An attacker stores `attachmentUrl = "http://169.254.169.254/latest/meta-data/iam/security-credentials/.png"`. The regex is satisfied; `@react-pdf/renderer` server-fetches the metadata endpoint; output embeds the response.

**Fix:** run `attachmentUrl` through `assertPublicHost` (the helper `src/actions/contact-actions.ts:36-83` already implements) at write time. Re-validate at PDF render. Or restrict to uploaded blobs only.

### H-2. Microsoft Graph `sendMail` lacks the CRLF / address sanitisation that Gmail got
**File:** `src/lib/email/microsoft-graph.ts:147-165`

S-4 fixed Gmail's MIME header injection by introducing `stripControlChars` and `assertSingleRfc5322Address` (`src/lib/email/gmail.ts:163-169`). The Graph path doesn't call them. Graph's JSON body is mostly safe, but the lack of even a single-recipient assertion on `to` means a value containing `, attacker@x.com` is silently passed through; the OData fallback filter at `microsoft-graph.ts:208` will reject CRLF in `subject` rather than execute, but the asymmetry is wrong.

**Fix:** move `stripControlChars` + `assertSingleRfc5322Address` to a shared `src/lib/email/sanitize.ts` and call from both providers.

### H-3. No role enforcement — every authenticated org member is effectively owner
**Files:** `prisma/schema.prisma` (`User.role String @default("owner")`), every action

The role field exists, has a default, and is never read. Any compromised low-trust account can rewrite org settings, wipe suppressions (then mail people who unsubscribed → CAN-SPAM/Australian Spam Act exposure), delete every template, disconnect mailboxes.

**Fix:** add a `requireRole("owner" | "admin")` helper used at action boundaries. Gate `updateOrganizationSettings`, `removeSuppression`, `disconnectEmail`, `deleteTemplate` first. Then graduate to invitations + member role.

### H-4. Manual-send race can dual-deliver
**File:** `src/actions/outreach-actions.ts:407-420` (`loadSendableOutreach`) — also Bug-likely #10

`loadSendableOutreach` checks `claimedAt: null` *but never sets it*. Only the cron sets `claimedAt`. Two parallel manual sends both pass the check, both load the row, both call `provider.send`, both `markOutreachSent`. One DB row, two emails delivered. Doubly bad with the `useTransition` setup in `outreach-send-card.tsx:82-93`, where two rapid clicks both enter the transition.

**Fix:** atomic claim via `update` with `where: { id, status: 'approved', claimedAt: null }` returning rows-affected; abort if 0. Same idempotency in `scheduleOutreach` so a reschedule mid-flight doesn't free the row to be re-claimed (Bug-likely #11).

### H-5. Cron retry storm on permanent failures
**File:** `src/app/api/cron/send-scheduled/route.ts:107-110`

When `sendOutreachWithAccount` fails, `claimedAt` is reset to null and the next tick retries. There's no failure counter, no exponential backoff, no terminal "give up" state. A bad address or a malformed body becomes a hot loop hammering the provider. Suppressed-address sends throw, get released, throw again, forever.

**Fix:** add `Outreach.sendFailureCount` + `lastSendError`, transition to a `failed` terminal state at N=3 with backoff. Surface in the UI.

### H-6. Follow-ups generated after the contact already replied to the original
**File:** `src/lib/email/follow-up.ts:197-223`

`needsFirstFollowUp` and `needsSecondFollowUp` query by `(followUpNumber=N, status='sent')`. When a contact replies, `OutreachStatus.replied` flips on the *original* (followUpNumber=0), not on the follow-up. So if the contact replies *between* sending follow-up #1 and the cron's next tick, the follow-up #1 row stays `sent` and the cron generates follow-up #2 anyway. Same hole if they reply before #1 fires — the followUpNumber=0 row also stays `sent`.

**Fix:** check whether *any* outreach to the same `(contactId, campaignId)` is in `replied` state, or include `replies: { none: {} }`.

### H-7. Vercel Blob upload uses raw client filename as the key, no per-org prefix
**File:** `src/app/api/upload/route.ts:80-82`

`put(file.name, file, { access: "public" })`. All tenants share one flat namespace; URL contains arbitrary unicode/control chars from the filename; no audit story per tenant; no `addRandomSuffix: true` setting (defaults vary by SDK version, easy to regress).

**Fix:** key as `${orgId}/${kind}/${crypto.randomUUID()}.${ext}` with `addRandomSuffix: false`. Store original filename in a column if needed for display.

### H-8. Phase state machine: non-transactional + no transition validation
**File:** `src/actions/phase-actions.ts:8-58`

Three sequential writes outside any transaction (phase update → next phase activate → campaign `currentPhase` update). A crash mid-flight leaves the DB inconsistent. There's also no validation that the requested transition is legal — a user can flip an arbitrary phase to `complete` regardless of order. `revertToPhase` (line 60-90) wraps its writes in `$transaction`, demonstrating the missing pattern. Combined with the action wrapper revalidating only on success (`src/lib/server/action.ts:12-26`), partial DB writes leave stale UI.

**Fix:** wrap in `$transaction`. Add a transition-validity matrix (e.g. only sequential `pending → active → complete`).

---

## Medium — security and correctness

- **M-1. OAuth callback collapses provider rows.** `src/app/api/email/callback/route.ts:58-87`, `src/app/api/email/google/callback/route.ts:54-83`. Both do `findFirst({ userId })` with no provider filter; connecting Outlook silently overwrites Gmail tokens. Fix: scope by `(userId, provider)`; add `@@unique([userId, provider])` once data is reconciled.
- **M-2. `sanitizeSignatureHtml` allows `style` attribute on every tag.** `src/lib/compose/sanitize-html.ts:11-14`. DOMPurify v3 strips `expression()` / `behavior:` / `javascript:`, but `position:fixed; z-index:9999` style payloads still allow in-app UI redress in the signature preview's `dangerouslySetInnerHTML`. Drop `style` from the allow-list, or use stricter CSS post-processing.
- **M-3. `extractFontStyle` re-injected without revalidation.** `src/lib/compose/extract-signature.ts:9-22`. Captured CSS pieces from scraped sent items are pasted back into a `style` attribute in `renderOutreachHtml` without sanitisation. Validate against allow-listed character classes and length caps before storage. Pairs with C-6.
- **M-4. Unsanitised `Reply.bodyHtml` storage.** `src/lib/email/follow-up.ts:121-132`. Today rendered only as React text, but the column is a stored-XSS bomb waiting for the first inbox UI that uses `dangerouslySetInnerHTML`. Sanitise on write.
- **M-5. CSV import slug collision race.** `src/actions/import-actions.ts:213-220, 266-269`. Two parallel imports both pre-fetch existing slugs, both reserve `jane-doe`; `createMany.skipDuplicates` silently drops the loser. Fix: insert with collision detection per-row, fall back to `slug-2`/`slug-3`.
- **M-6. `forceMergeMap` invalid IDs silently fall through to "create new".** `src/actions/import-actions.ts:147-160, 191-209`. User explicitly asked to merge into X; if X doesn't exist for their org, a fresh contact is created instead of an error.
- **M-7. CSV in-batch dedup is email-only.** `src/actions/import-actions.ts:131-138`. Two rows with the same name and no email both create new contacts.
- **M-8. Microsoft Graph fallback subject search swallows errors.** `src/lib/email/microsoft-graph.ts:185-225`. Send succeeds; the post-send conversationId resolution throws a 401 → caller treats whole send as failed → cron retries → duplicate delivery (also pairs with H-5). Wrap the search in try/catch; preserve the original `messageId` from the draft as the source of truth.
- **M-9. Gmail token rotation is dropped.** `src/lib/email/gmail.ts:144-152`. Google can rotate refresh tokens; if `credentials.refresh_token` returns, this code never persists it. Eventually the stored refresh token expires and the account silently breaks. Microsoft's path handles this. Persist the new refresh token if present.
- **M-10. `extractContent-length`-bypass on photo download.** `src/actions/contact-actions.ts:70-71`. Missing `Content-Length` header → length defaults to 0 → cap passes → `arrayBuffer()` reads the full chunked body without a streaming cap.
- **M-11. `Outreach.subject`/`body` template substitution lacks HTML escape.** `src/lib/templates/render.ts:22-27` writes raw token values into strings then sent through `renderOutreachHtml` (C-6). Add `renderText` and `renderHtml` variants.
- **M-12. Token storage at rest is plaintext.** `EmailAccount.accessToken/refreshToken` are `String @db.Text`, no encryption. A read-only DB compromise yields long-lived Gmail/Outlook send-and-read for every connected user. Schedule for a hardening sprint with envelope encryption.

---

## Performance — P0

- **P0-1. `getAllOutreaches` is unbounded.** `src/lib/queries/outreach-queries.ts:5-23` — every outreach in the org with `contact + campaign + client` includes, no `take`, no pagination. Consumed by `/outreach` which renders all of them in a client-side Kanban (`outreach-list-client.tsx`). At 50K rows this is ~30 MB RSC payload + a likely OOM on mobile.
- **P0-2. `/contacts` ships every contact + every tag assignment to the client.** `src/app/(app)/contacts/page.tsx:17-41` — `getContacts` (no pagination) + a second `findMany` over every tag assignment, both serialised into the client component. Will blow Vercel's 4.5 MB response cap at 50K contacts.
- **P0-3. `/clients` page does an N+1 over campaign-contact counts.** `src/app/(app)/clients/page.tsx:110-119` does `Promise.all(clients.map(c => db.campaignContact.count(...)))` with no cache. 100 clients = 100 round trips per page load. Replace with one `groupBy`.
- **P0-4. 14 page files call `db.organization.findFirst()`.** Same root cause as the C-1 → C-5 cluster, also a wasted round trip on every page render. (See Critical section.)
- **P0-5. `db.emailAccount.findFirst()` with no scoping.** Same as C-4 — full-table scan across all tenants.
- **P0-6. `papaparse` in the client bundle via the importer.** `src/components/contacts/contact-importer.tsx` imports `csv-parser.ts` which imports papaparse. Intentional, but worth a `dynamic(import, { ssr: false })` split to keep ~50 KB off the main contacts chunk if `/contacts/import` isn't the first landing page.

## Performance — P1

- **P1-1. Missing schema indexes.** `Campaign` filters by `organizationId + status + type + clientId` and orders by `createdAt desc`; the only existing indexes are `@@unique([organizationId, slug])` and `@@index([archivedAt])`. Add `@@index([organizationId, status])`, `@@index([organizationId, type])`, `@@index([clientId])`. Verify Contact's `organizationId+createdAt` index covers the segment-builder paths via `EXPLAIN`. Coverage's `organizationId+type` is also missing.
- **P1-2. `Suppression.findFirst` per send in cron.** `src/actions/outreach-actions.ts:434-445` is fast (primary index) but unnecessary inside a per-org cron loop. Prefetch the org's suppression set once per tick into a Set; pass into the send function.
- **P1-3. `getCoverageStats`/`getClientStats` read every row to compute aggregates.** `src/lib/queries/coverage-queries.ts:54-89`, `client-queries.ts:117-130` — pull every coverage/outreach row to do a sum or histogram in JS. Replace with raw SQL aggregate (the dashboard already drops to `Prisma.sql` for byDay).
- **P1-4. `suggestContacts` inlines the entire org contact table into the prompt.** `src/actions/outreach-actions.ts:251-273` — `findMany` with no projection, every column for every contact, fed verbatim to Claude/OpenAI. Pre-filter by tier/relevance; `select` only the fields actually used (id, name, outlet, beat, tier).
- **P1-5. `check-replies` cron is unbounded per org.** `src/lib/email/follow-up.ts:33-48` selects every outreach in the 14-day window with no `LIMIT`. Daily cadence + 5K active threads = 5K Gmail/Graph calls in one tick. Sort by `lastCheckedForReplyAt asc nulls first`, take N per tick, run more frequently.
- **P1-6. `loadSendableOutreach` re-reads campaign per send in cron.** `src/actions/outreach-actions.ts:407-432` — N round-trips for an N-row batch. Hydrate once with `findMany({ id: { in: ids } })`, build a Map.
- **P1-7. `unstable_cache` wrappers constructed per call.** `getContactByIdCached`, `getCampaignByIdCached`, etc. wrap the cache function inside the closure on every invocation. Move the wrapper to module scope and pass the id as the function argument — current pattern skips the framework's per-key dedupe guarantee.
- **P1-8. `bulkSend` runs sends serially.** `src/actions/outreach-actions.ts:526-536` — 200-pitch bulk send is multiplicatively latent. Use the same `mapLimit` pattern the cron does.
- **P1-9. PDF render-on-demand with no cache.** `src/app/api/reports/[campaignId]/route.ts` re-renders every time. Cache buffer in Vercel Blob keyed by `(campaignId, content-mutation-tag)` or `Cache-Control: private, max-age=300`.

---

## Bugs — Bug-likely

- **B-1. `updateCampaign` silently drops invalid status updates.** `src/actions/campaign-actions.ts:91-95` validates with `statusRaw in CampaignStatus`. The form (`campaign-form.tsx:218-221`) exposes a `value="outreach"` option, but the enum only has `draft|active|complete`. Submit "Outreach" → `status = null` → action skips the column → user sees no error. The `in` operator is also wrong — `Object.keys(CampaignStatus)` matches values for string-valued Prisma enums, but `"toString" in CampaignStatus` is also true. Same shape in `event-actions.updateGuestRsvp:224`. Use a strict allow-list set.
- **B-2. `cron/check-replies` `Promise.all` rejects on the first failure.** `src/app/api/cron/check-replies/route.ts:50-63` — one org's token-refresh failure kills the whole batch and skips `generateFollowUps` for everyone. Use `Promise.allSettled` and report partial success.
- **B-3. Reply-quoting strip is fragile.** `src/lib/email/reply-body.ts:30-36` greedy-matches `\nOn .{0,200} wrote:[\s\S]*$`. A reply that quotes "On Friday I wrote: ..." in its actual body gets truncated. The `\nFrom: .+\nSent: .+` marker also misfires on forwarded content.
- **B-4. `htmlToText` HTML decoding is incomplete.** `src/lib/email/reply-body.ts:6-22` handles only six entities. Numeric (`&#x27;`), curly quotes, `&apos;` pass through verbatim.
- **B-5. `download-and-store-photo` content-length 0 bypass.** Already mentioned as M-10 — calling out under bugs because the resulting object is stored as user data.
- **B-6. `cancelScheduledOutreach` doesn't gate on status.** `src/actions/outreach-actions.ts:384-405`. A `sent` row can have its `scheduledAt` cleared. Defensive UI bug.
- **B-7. `slugify` truncation produces collisions on long names.** `src/lib/slug/slugify.ts:12` cuts at 60 chars; two long legal-entity names sharing a prefix collide. There's no slug-history table, so renames break old URLs without a redirect map (the static `/workspaces` → `/clients` redirect in `next.config.ts` doesn't help intra-model renames).
- **B-8. PDF formatDate accepts bad ISO strings.** `src/lib/pdf/campaign-report.tsx:36-40` — `new Date("not-a-date").toLocaleDateString()` returns "Invalid Date" instead of "—".
- **B-9. PDF reply-rate divide-by-zero on empty campaigns.** Verify the caller defends against `replies/sent` when `sent === 0`.
- **B-10. `reorderRunsheetEntries` per-row update lacks org filter.** `src/actions/event-actions.ts:185-200` — preflight count is org-scoped, but each `update` in the transaction uses only `id`. Concurrent move out of org wins. Fold org check into each update.
- **B-11. `removeSupplierFromCampaign` deletes ALL line items linked to that (campaign, supplier).** `src/actions/budget-actions.ts:86-88`. Two legitimate budget rows for different scopes of work both get nuked.
- **B-12. `monthlyEquivalentCents` rounds at storage; UI re-divides.** `src/lib/retainer.ts:22-27, 56-67`. Fortnightly $1000 → 26/12 × 100000 cents → $2167 displayed, true $2166.67. Tiny but propagates if anyone multiplies the displayed string by 12.
- **B-13. `auth.ts` session callback is mutate-on-read.** `src/lib/auth.ts:33-38`. Every page hit re-reads `session.user.organizationId` off the user record. If an admin changes a user's org server-side, the next session callback overrides any cached value and silently re-routes mid-session. Worth a comment, not a fix.
- **B-14. Tests pass with `vitest` not actually installed.** The `package.json` ships `@vitest/ui` but not `vitest`. After installing, 82/85 tests pass; the 3 failures are in `src/lib/outreach/schedule.test.ts` because `OutreachStatus` imports as undefined when Prisma client isn't generated. Either inline the enum value in `schedule.ts` or mock `@prisma/client` cleanly.

---

## UI/UX — top 10 prioritised

1. **Convert every form to React 19 `<form action={serverAction}>` with `useActionState`/`useFormStatus`.** Today no form uses a `<form>` element — they're `<div>`s with onClick submit (`contact-form.tsx:148`, `client-form.tsx:96`, `campaign-form.tsx:113`). Enter doesn't submit, browser autofill misses, accessibility tools miss the form semantics. Mark required fields, add `autoComplete`, `inputMode="tel"` on phone, `autoFocus` on first field.
2. **Make slide-overs and confirm dialogs accessible.** `src/components/shared/slide-over-panel.tsx`, `confirm-dialog.tsx`, `outreach/schedule-modal.tsx` lack focus trap, `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape-to-close. `@base-ui/react` is already a dep — its `Dialog` does this for free.
3. **First-run onboarding for new orgs.** Dashboard with three "0" stat cards is bleak. Replace with a checklist when `clientCount + contactCount === 0`. Pairs with C-2 — a fresh org per signup means there's a real blank slate to onboard from.
4. **Mobile navigation overhaul.** No mobile top app bar; the only nav entry is a 40 × 40 floating circle (`app-shell.tsx:84-103`). Search and notifications are unreachable on mobile. Audit touch targets to ≥44 × 44 (close-X is 24-28, bell is 38). Outreach kanban is a hard-coded `repeat(4, 1fr)` grid — 80 px columns on phone are unusable.
5. **Replace `window.prompt`/`window.confirm` for save/delete segment.** `src/components/contacts/contacts-list-client.tsx:135, 151` — feels prototype-grade. Add an undo toast for archive/delete instead of "Are you sure?" fatigue.
6. **Multi-select + bulk actions on lists.** Contacts, outreach, suppliers, coverage. Row checkbox, "Select all on page", bulk tag/archive/export when ≥1 row selected. Table-stakes for a CRM.
7. **Wire URL state for tabs + filters.** `campaign-tabs.tsx:192` reads `?tab=` on mount but never writes back; refresh loses tab. Same for contact filters and saved segments.
8. **Unify design tokens.** Two parallel systems — shadcn `--primary` vs custom `--accent-custom`. Inline `style={{ backgroundColor: 'var(--accent-custom)' }}` everywhere; theme overrides don't propagate. Pick one, migrate the hot components (`Button`, `Field`, `TextInput`, `Card`, `EmptyState`, `PageHeader`).
9. **Accessibility pass on tables and icon buttons.** `<th scope="col">`, real `<a>` rows or keyboard handlers in `contact-table.tsx`, `aria-label` on every icon-only button (`topbar.tsx` bell, segment delete, kanban "+" decoration), `role="alert"`/`aria-live="polite"` on form error blocks, restore visible focus rings (do not `outline: none` without a replacement).
10. **Reports & exports surface.** PDF route exists at `/api/reports/[campaignId]` but isn't reachable from the campaign page. Add a "Reports" entry in IA, expose CSV export on contacts/coverage/outreach, embed org logo in the generated PDF (org logo only shows in desktop topbar today).

---

## Competitive position — 2026-04-30 refresh

The 2026-04-17 snapshot still holds. Sprint 1+2 erased nine of thirteen "missing" items. Pressroom is "sellable except for billing." Full feature matrix and detailed sources in `docs/market-analysis/` (refresh below).

### Five deltas worth the read

1. **Muck Rack now has two AI moats**, not one. *AI Visibility Badges* (2026-03-05) and *Curation Engine* (natural-language list building, 2026-04-28) sit on top of Generative Pulse. The marketing stat — **2% overlap between journalists PR teams pitch and the sources LLMs cite** — reframes the category around "where do LLMs cite" rather than "which journalists do you know." [GlobeNewswire](https://www.globenewswire.com/news-release/2026/03/05/3250530/0/en/Muck-Rack-Launches-AI-Visibility-Badges.html), [Generative Pulse site](https://generativepulse.ai/).
2. **Prowly is now structurally inside Semrush** as the "AI PR Toolkit" — not branding only, signup is via Semrush dashboard. Bundled SEO + PR + AI Visibility at one login is hard to dislodge. Treat Semrush as the competitor going forward. [Camille Prairie analysis](https://camilleprairie.co/blog/what-we-know-about-semrushs-new-ai-visibility-feature-and-what-it-means-for-2026).
3. **Propel 2.0** shipped a refreshed UI, AI inside the Gmail/Outlook plug-in, self-guided onboarding. Still anchored at $199/mo with a free trial. Continues to occupy the only "real PR CRM under $200" slot besides Prezly at $100. [propelmypr.com](https://www.propelmypr.com/).
4. **Cision** rolled out Instant Insights + Social v2 (Instagram + LinkedIn, TikTok coming) inside the *Integrated AI Suite*. Pricing still opaque, median ~$12.5K/yr. [PR Newswire](https://www.prnewswire.com/news-releases/cisionone-expands-ai-powered-platform-with-enhanced-instant-insights-and-social-intelligence-302557904.html).
5. **The "<$200/mo PR CRM" band is still under-served.** Propel + Prezly only. Pressroom can occupy this slot the moment Stripe billing ships.

### Refreshed feature matrix (abbreviated)

✅ solid · ⚠️ partial / weak · ❌ absent

| Feature | Pressroom | Prowly (Semrush) | Prezly | Propel | Muck Rack | Cision | BuzzStream |
|---|---|---|---|---|---|---|---|
| Multi-client workspaces | ✅ per-client rooms | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| Retainer cadence | ✅ weekly/fortnightly/monthly | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Event production (runsheets + suppliers) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI pitch generation | ✅ multi-provider | ✅ | ✅ | ✅ in Gmail/Outlook | ✅ + Curation Engine | ✅ AI Suite | ⚠️ |
| Gmail + Outlook send | ✅ both | ✅ | ✅ | ✅ native plug-ins | ✅ | ✅ | ⚠️ SMTP |
| Open / click tracking | ⚠️ open via Resend; click TBD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reply body extraction | ✅ tested | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Filterable dashboard + trends | ✅ Sprint 2 | ✅ | ✅ | ✅ | ✅ Insights v2 | ✅ Instant Insights | ⚠️ |
| Hosted newsroom | ❌ | ✅ | ✅ Sites, 39 langs | ❌ | ❌ | ⚠️ wire | ❌ |
| Bundled media database | ❌ BYO | ✅ + Semrush traffic | ❌ partner | ✅ 500K + 50M | ✅ | ✅ | ⚠️ ListIQ |
| Media monitoring + alerts | ❌ | ✅ Brand Journal | ⚠️ | ✅ | ✅ Pulse + Social | ✅ | ❌ |
| Gen-AI brand visibility | ❌ | ⚠️ Semrush AI Visibility | ❌ | ❌ | ✅ Generative Pulse + Badges | ⚠️ | ❌ |
| ROI reporting (earned → traffic) | ❌ | ⚠️ Semrush join | ❌ | ✅ business outcomes | ⚠️ | ✅ | ❌ |
| Stripe self-serve billing | ❌ | ⚠️ Semrush bundle | ✅ | ✅ trial | ❌ enterprise | ❌ | ✅ |
| Team invites + roles | ❌ field only | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transparent monthly < $200 | n/a | ❌ ~$369 | ✅ $100 | ✅ $199 | ❌ | ❌ | ✅ $24 |

### Top 8 commercial recommendations (anchored to *current* inventory)

1. **Stripe self-serve billing + seat plans (M).** The only thing standing between Pressroom and revenue. Marketing wedge: "monthly, cancel anytime, no 90-day auto-renewal trap" — directly contrasts the Cision/Meltwater reputation for refund refusals.
2. **Team invites + role enforcement (M).** Role field already exists and is inert (H-3). Without this the multi-client workspace pitch is hollow because everyone shares one login. Pairs with C-2 (fresh-org-per-signup).
3. **Click tracking + bounce decay (S).** Open tracking is in. Click is the natural Resend extension. Feed bounce events into a `Contact.health` decay so stale rows auto-demote — owns the "freshness layer" white-space the prior snapshot identified.
4. **Public newsroom route (M).** Slug infrastructure (Sprint 2) already shipped. Re-render Client + Coverage + Campaign content at a public slug. Closes parity gap vs Prezly/Prowly; differentiates vs Propel/Muck Rack.
5. **Generative-AI visibility weekly cron (M).** Muck Rack just productised this and bombed the industry with the 2% overlap stat. SMB version: 20 templated industry questions weekly, log brand mentions across Claude/GPT/Perplexity, diff week-over-week. Single-digit dollars per org per month using the existing AI provider abstraction.
6. **Coverage attribution from monitoring hits (M, depends on monitoring).** When a coverage URL appears mentioning a brand, propose a Coverage record auto-linked to the most recent outreach to that journalist. The wedge no incumbent owns at SMB price.
7. **Lightweight media monitoring (L).** GDELT + Google News RSS + Reddit + HN + Bluesky workers, dedup, Haiku relevance filter, daily digest. Brand24/Mention bottom out at ~$299/mo — white-space at SMB tier. Per-client structure already in place.
8. **Contact freshness tooling (S–M).** LinkedIn reconcile + email verifier on import. Stale-data complaints are universal across Cision, Agility, Prowly, Pitchbox. Becomes the trust-layer story.

**De-prioritise:** building a curated journalist database, multilingual social listening (Instagram/LinkedIn/TikTok APIs). Both are out of scope for the boutique buyer and capital-intensive.

---

## Summary

Sprint 2 made Pressroom genuinely safer, faster, and more sellable. The action layer is now correctly tenant-scoped, OAuth/email flows are hardened, and the product has crossed into "sellable except for billing." The single dominant finding is that the page layer reproduces the same `db.organization.findFirst()` antipattern the action layer was just rescued from — five Critical security findings and one bug-blocking correctness item all collapse into one mechanical sweep. After that, work the High items (XSS in `renderOutreachHtml`, SSRF on coverage, manual-send race, role enforcement, cron retry storm, Outlook CRLF parity) and ship Stripe + invitations to monetise. The competitive ground is open at the boutique-agency tier, and the Sprint 2 retainer + multi-client + event-production combination is a genuine moat against everything except Propel and Prezly.

## Reviewers

Five parallel agents under `claude/code-review-benchmark-ify8x`:

- Security audit (`abc33b3204b611014`) — auth, OAuth, server actions, uploads, OWASP, prior-finding verification.
- Performance audit (`a7fe1a3557b3f13cb`) — DB queries, N+1, RSC, caching, indexes, cron bounds.
- Bug/correctness review (`a1b61528e36b5b702`) — server actions, state machines, races, dates/timezones, tests.
- UI/UX audit (`a47bed5235801300b`) — IA, forms, lists, dialogs, mobile, accessibility, empty/loading/error.
- Competitor benchmark (`a7ebea576716189f1`) — refresh of 2026-04-17 snapshot with Q1/Q2 deltas.

Full agent outputs available in audit logs.
