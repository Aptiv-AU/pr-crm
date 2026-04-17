# Codebase Review — 2026-04-18

Post-Sprint-1 review covering security, performance, simplicity, and elegance. Four specialised reviewers ran in parallel against the `feature/sprint-1-commercialisation` branch. Findings consolidated by severity and impact. File:line references are authoritative.

## Executive summary

Pressroom is in genuinely good shape for two months of solo work: clean directory conventions, pure testable libs under `lib/`, a sensible actions/queries split, and several Sprint 1 additions that got the shape right on the first pass. There is no architectural debt that would warrant a rewrite.

But there is **one systemic issue that dominates every other category**: org-scope authorization is effectively absent. Every server action resolves "which org are we acting on?" with `db.organization.findFirst()` instead of reading it from the authenticated user's session. The proxy forces sign-in on rendered pages but skips `/api`. And several API routes have no auth check at all. Today — single tenant in practice — the damage is contained. The **first multi-tenant customer triggers total cross-tenant data exposure**.

The good news is that fixing this one issue unlocks about 60% of the rest of the backlog: the auth fix becomes a `requireOrgId()` helper, which provides the seam to insert an action wrapper, which in turn deletes ~500 lines of copy-pasted `try/catch/revalidate/console.error` boilerplate across 9 action files. Three mechanical changes get you security, architecture, and readability wins at once.

**Top 5 in strict order:**

1. **Auth + org scoping** (Critical security). Replace every `findFirst()` with `requireOrgId()` derived from session. Scope every mutation's target lookup by `organizationId`. Guard unauthenticated API routes (`/api/generate-pitches`, `/api/reports/[id]`, `/api/email/disconnect`, `/api/upload`) with `auth()`. This alone closes 3 Critical and 3 High severity findings.
2. **Action wrapper + `requireOrgId()`** (Architecture). Extracts the ceremony from 36 server actions, gives (1) a single point of change.
3. **Email header-injection fix in `sendGmail`** (High security). Strip CRLF from subject/to fields before MIME assembly.
4. **CSV import batching** (Performance). `createMany` + in-memory dedup replaces N×2 round-trips with 2 queries. 30–50× faster on 1000-row imports.
5. **Outlet/publication rename cleanup** (Readability). Mechanical rename kills a codebase-wide dual-naming tax.

The rest is meaningful but not urgent.

---

## Critical — security / correctness

### S-1. Any authenticated user can act on any org's data
**Severity:** Critical — multi-tenant blocker
**Files:** `src/actions/contact-actions.ts:56`, `client-actions.ts:8`, `campaign-actions.ts:8`, `supplier-actions.ts:8`, `coverage-actions.ts:8`, `template-actions.ts:9`, `segment-actions.ts:9`, `tag-actions.ts:7`, `search-actions.ts:19`, `settings-actions.ts:7`, `suppression-actions.ts:8`, `import-actions.ts:17`, `outreach-actions.ts` (entire file — no auth anywhere)

Every action resolves `organizationId` via `db.organization.findFirst()` and never compares against `auth()`'s session. Mutations take raw IDs from the client with no org check.

**Attack path:** User B signs in, calls `sendOutreach(someOutreachIdFromUserA)` → user A's connected Gmail sends mail on A's behalf.

**Fix:**
```ts
// src/lib/server/org.ts
export async function requireOrgId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.organizationId) throw new Error("Unauthorized");
  return session.user.organizationId;
}
```

Replace all `db.organization.findFirst()` call sites. Pair with scoped lookups:
```ts
// Before
const campaign = await db.campaign.findUnique({ where: { id } });

// After
const campaign = await db.campaign.findFirst({
  where: { id, organizationId: await requireOrgId() }
});
```

### S-2. OAuth callbacks bind tokens to "the oldest user in the DB"
**Severity:** Critical
**Files:** `src/app/api/email/callback/route.ts:50`, `src/app/api/email/google/callback/route.ts:43`

Both callbacks do `db.user.findFirst({ orderBy: { createdAt: "asc" } })` instead of reading `auth()`. Whoever clicks "Connect Gmail" second will have their tokens written onto the first-registered user's account.

**Fix:** Call `auth()` at the top; refuse if no session; use `session.user.id` in the upsert.

### S-3. Unauthenticated API routes that do real work
**Severity:** Critical
**Files:**
- `src/app/api/generate-pitches/route.ts` — no auth, consumes AI tokens, writes drafts, takes raw `campaignId` + `contactIds`
- `src/app/api/reports/[campaignId]/route.ts` — no auth, returns full PDF campaign report given an ID guess
- `src/app/api/email/disconnect/route.ts` — no auth, deletes "the first user's" email accounts
- `src/app/api/upload/route.ts` — no auth, Vercel Blob uploads

`src/proxy.ts:16` explicitly excludes `/api` from its auth matcher, so these are fully public.

**Fix:** Add `auth()` guard at the top of each. Consider reversing the proxy matcher to an allowlist of public routes (`/api/auth/*` only).

### S-4. Email header injection via outreach subject
**Severity:** High
**File:** `src/lib/email/gmail.ts:108-120`

Subject is concatenated into a `\r\n`-joined MIME header string. A subject containing CR/LF (injectable via `updateOutreachDraft` from any authenticated user — see S-1) can inject extra headers (Bcc, Reply-To) or a complete second email body.

**Fix:** In `sendGmail`, strip control chars from subject before header construction:
```ts
const safeSubject = subject.replace(/[\r\n\t\x00-\x1f]/g, " ").trim();
```

Validate `to` is a single RFC-5322 address. Microsoft Graph path is safe (JSON, not raw MIME).

### S-5. Stored XSS via scraped email signature
**Severity:** Medium
**Files:** `src/lib/compose/resolve-style.ts`, `src/components/settings/email-style-manager.tsx:93`, `src/actions/outreach-actions.ts:300-303`

Signature HTML is scraped raw from user's Sent Items via Gmail/Graph and stored in `EmailAccount.signatureHtml`, then rendered with `dangerouslySetInnerHTML` in settings and concatenated into every outgoing pitch. If malicious HTML enters the user's Sent folder (compromised mail client, self-emailed payload), it executes in the Pressroom origin.

**Fix:** Sanitize with `sanitize-html` or DOMPurify server-side before writing to DB.

### S-6. Additional Medium findings (consolidated)

| # | File | Issue | Fix |
|---|------|-------|-----|
| S-6a | `src/actions/import-actions.ts:13` | Unbounded CSV import rows → DoS | Cap at 5000 rows; rate-limit |
| S-6b | `src/actions/suppression-actions.ts:47` | `removeSuppression(id)` not org-scoped | Scope by `organizationId` (closes under S-1 too) |
| S-6c | `src/actions/settings-actions.ts:24` | `updateUserProfile(userId, …)` takes arbitrary userId | Force `userId = session.user.id` |
| S-6d | `src/app/api/cron/check-replies/route.ts:7` | `CRON_SECRET` missing = open | Fail-closed: 401 if env var unset |
| S-6e | `src/actions/contact-actions.ts:7-47` | SSRF guard uses hostname regex; vulnerable to DNS rebinding | Resolve DNS, validate resolved IP isn't private; `redirect: "manual"` on fetch |

### S-7. Security patterns done right — keep

- OAuth state cookies: HttpOnly, SameSite=lax, Secure in prod, 10-min TTL, deleted on exchange (`src/app/api/email/connect/route.ts:12-18`)
- SSRF cap + type/size + content-type allowlist on photo download (baseline is good; tighten per S-6e)
- Suppression check before provider dispatch (`src/actions/outreach-actions.ts:258-267`)
- Token refresh with 5-min clock-skew buffer (both providers)

---

## High — architecture / performance

### A-1. Extract action wrapper + `requireOrgId()`
**Effort:** S
**Impact:** ~500 LOC deleted; closes the seam for S-1 and S-3

```ts
// src/lib/server/action.ts
export function action<A extends unknown[], R>(
  name: string,
  fn: (...args: A) => Promise<{ data?: R; revalidate?: string[] }>
) {
  return async (...args: A) => {
    try {
      const { data, revalidate } = await fn(...args);
      revalidate?.forEach(revalidatePath);
      return { success: true as const, ...data };
    } catch (err) {
      console.error(`${name} error:`, err);
      return { error: err instanceof Error ? err.message : `Failed: ${name}` };
    }
  };
}
```

**Before** (`campaign-actions.ts:446-502` — 4 functions × 14 lines = 56):
```ts
export async function archiveCampaign(id: string) {
  try {
    await db.campaign.update({ where: { id }, data: { archivedAt: new Date() } });
    revalidatePath("/campaigns");
    return { success: true };
  } catch (error) {
    console.error("archiveCampaign error:", error);
    return { error: error instanceof Error ? error.message : "Failed to archive" };
  }
}
// ... 3 near-identical variants
```

**After:**
```ts
export const archiveCampaign = action("archiveCampaign", async (id: string) => {
  await db.campaign.update({ where: { id }, data: { archivedAt: new Date() } });
  return { revalidate: ["/campaigns"] };
});
```

`campaign-actions.ts` shrinks from 502 → ~280 lines. Same pattern applied across all 9 action files.

### A-2. `EmailProvider` interface
**Effort:** M
**Files:** `src/lib/email/gmail.ts`, `src/lib/email/microsoft-graph.ts`, `src/actions/outreach-actions.ts:290-332`, `src/lib/email/follow-up.ts:34-56`

The return shapes are already aligned — the abstraction is sitting there waiting.

```ts
// src/lib/email/provider.ts
export interface EmailProvider {
  name: "gmail" | "microsoft_graph";
  getValidToken(accountId: string): Promise<string>;
  send(token: string, msg: OutgoingMessage): Promise<{ messageId: string; threadId: string }>;
  getReplies(token: string, threadId: string, after: Date): Promise<Reply[]>;
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenBundle>;
}

export function providerFor(account: EmailAccount): EmailProvider {
  return account.provider === "google" ? gmailProvider : msProvider;
}
```

`sendOutreach` branching collapses from 20 lines to 3. Rename `Outreach.conversationId` → `Outreach.threadId` in the same migration.

### A-3. CSV import batching
**Effort:** S
**File:** `src/actions/import-actions.ts:27-93`
**Impact:** 30–50× faster on 1000-row imports

Current: 2N round-trips. A 1000-row import at 30ms RTT = ~60s (Vercel timeout risk).

**Fix:**
```ts
const emails = contacts.map(c => c.email?.toLowerCase()).filter(Boolean);
const existing = await db.contact.findMany({
  where: { organizationId: orgId, email: { in: emails } },
  select: { id: true, email: true, outlet: true, beat: true, /* merge fields */ },
});
const existingByEmail = new Map(existing.map(e => [e.email!.toLowerCase(), e]));
// Partition → createMany({ skipDuplicates: true }) for inserts,
// $transaction of batched updates in chunks of 100
```

### A-4. Reply-checker cron parallelism
**Effort:** S
**Files:** `src/app/api/cron/check-replies/route.ts:33`, `src/lib/email/follow-up.ts:42`

Both outer (orgs) and inner (outreaches) loops are serial. 100 sent outreaches × 500ms = 50s per org, unbounded as data grows.

**Fix:**
- Add `lastCheckedForReplyAt` column to `Outreach`; filter by `lt: oneHourAgo`
- Bound concurrency at 5 inside each org:
  ```ts
  for (let i = 0; i < outreaches.length; i += 5) {
    await Promise.all(outreaches.slice(i, i + 5).map(checkOne));
  }
  ```
- Stop checking outreaches older than 14 days unless user extends

### A-5. Missing Prisma indexes
**Effort:** S
**File:** `prisma/schema.prisma`

Current indexes: only `Client.archivedAt`, `Campaign.archivedAt`, `ContactTagAssignment.tagId`. At 2000 contacts most list queries will sequential-scan.

Add as a single migration:
```sql
CREATE INDEX "Contact_organizationId_createdAt_idx" ON "Contact"("organizationId", "createdAt" DESC);
CREATE INDEX "Contact_organizationId_beat_idx" ON "Contact"("organizationId", "beat");
CREATE INDEX "Contact_organizationId_tier_idx" ON "Contact"("organizationId", "tier");
CREATE INDEX "Contact_organizationId_outlet_idx" ON "Contact"("organizationId", "outlet");
CREATE INDEX "Contact_organizationId_email_idx" ON "Contact"("organizationId", "email");
CREATE INDEX "Outreach_campaignId_status_idx" ON "Outreach"("campaignId", "status");
CREATE INDEX "Outreach_status_sentAt_idx" ON "Outreach"("status", "sentAt") WHERE "conversationId" IS NOT NULL;
CREATE INDEX "Outreach_campaignId_contactId_followUpNumber_idx" ON "Outreach"("campaignId", "contactId", "followUpNumber");
CREATE INDEX "Interaction_contactId_date_idx" ON "Interaction"("contactId", "date" DESC);
CREATE INDEX "Interaction_organizationId_date_idx" ON "Interaction"("organizationId", "date" DESC);
CREATE INDEX "Coverage_organizationId_date_idx" ON "Coverage"("organizationId", "date" DESC);
CREATE INDEX "Coverage_campaignId_date_idx" ON "Coverage"("campaignId", "date" DESC);
CREATE INDEX "Coverage_contactId_idx" ON "Coverage"("contactId");
CREATE INDEX "CampaignContact_contactId_idx" ON "CampaignContact"("contactId");
CREATE INDEX "EmailAccount_userId_idx" ON "EmailAccount"("userId");
```

### A-6. `sendOutreach` is 125 lines doing six things
**Effort:** S
**File:** `src/actions/outreach-actions.ts:235-362`

Target:
```ts
export const sendOutreach = action("sendOutreach", async (id: string) => {
  const outreach = await loadSendable(id);
  await assertNotSuppressed(outreach);
  const account = await requireEmailAccount(outreach.campaign.organizationId);
  const html = renderOutreachHtml(outreach.body, account);
  const sent = await dispatchViaProvider(account, {
    to: outreach.contact.email!, subject: outreach.subject, bodyHtml: html,
  });
  await markSent(outreach.id, sent);
  await logInteraction(outreach);
  return { revalidate: [`/campaigns/${outreach.campaignId}`, "/outreach"] };
});
```

Each helper is 10–20 lines, names reveal intent. The `sentVia`/`conversationId`/`messageId` triple-declaration → if/else refill (lines 307–331) is the messiest paragraph in Sprint 1.

### A-7. `suggestContacts` over-fetches everything
**Effort:** S
**File:** `src/actions/outreach-actions.ts:188-193`

`db.contact.findMany({ where: { organizationId } })` with no limit or projection. At 2000 contacts = ~2MB shipped to AI prompt. Add `select: { id, name, outlet, beat, tier }`, pre-filter to tiers A/B or top-N by recent activity.

---

## Medium — readability

### R-1. `publication` ↔ `outlet` dual naming
**Effort:** S mechanical rename across ~41 files
**Symptom:** `{ ...contact, publication: contact.outlet ?? "" }` mapping appears 5+ times (`campaigns/[campaignId]/page.tsx:84`, `contacts/page.tsx:57`, `events/[campaignId]/page.tsx:73`, `outreach-actions.ts:206`, `segment-actions.ts:40`). `contact-actions.ts:70` reads `formData.get("publication")` and writes to `outlet` column — a reader will assume the column is named `publication`.

**Fix:** Pick `outlet` (matches DB, matches `beat`/`tier`/`kind` domain vocabulary). Keep "Publication" as a UI label only. Rename every prop, state var, form field name, and TypeScript type. Delete the mapping code.

### R-2. Extract `<Field>` / `<TextInput>` primitive
**Effort:** M
**Files:** `contact-form.tsx` (486 lines), `coverage-form.tsx`, `runsheet-editor.tsx`, `supplier-tabs.tsx`, `event-detail-client.tsx`, `template-form.tsx`

All six re-declare `inputStyle` / `labelStyle` / `toggleBtnBase` inline with small variations. A reader can't tell if the variations are deliberate.

```tsx
// src/components/ui/field.tsx
export function Field({ label, children, required, hint }) { /* label + layout */ }
export function TextInput(props) { /* styled <input> */ }

// use site:
<Field label="Name" required>
  <TextInput value={name} onChange={setName} />
</Field>
```

Likely cuts `contact-form.tsx` to under 200 lines; deletes ~150 lines across siblings.

### R-3. String statuses → Prisma enums
**Effort:** M (requires migration — honour the DB drift note in memory)
**Files:** `Campaign.status`, `Outreach.status`, `CampaignPhase.status`, `CampaignContact.status`, `CampaignSupplier.status` — all currently `String`, referenced across 24 files as magic strings

You already committed to this pattern with `SignatureSource` and `SuppressionReason`. Continue it. Enables switch-exhaustiveness; eliminates `status: "compete"` typo class.

### R-4. Split `campaign-actions.ts` (502 lines)
**Effort:** S
Mixes campaign CRUD, phase state machine, supplier linkage, budget line items, archive/reopen. Split into `campaign-actions.ts` / `phase-actions.ts` / `budget-actions.ts` — each ~120 lines.

### R-5. Centralise slug generation
**Effort:** S
Five action files repeat the same slug+collision pattern. Extract `generateSlug(model, orgId, name)`.

---

## Performance — caching opportunities

Zero `unstable_cache` / `cacheLife` usage. Five high-leverage additions:

1. **`getCurrentOrg()`** — `React.cache` + `unstable_cache` tagged `"org"`. Runs on every single page today.
2. **`getContactBeats(orgId)` / `getCampaignFilters(orgId)`** — rare changes, frequent reads. Tag-invalidate on mutation.
3. **`getOrganizationStats` / `getContactStats` / `getOutreachStats`** — sidebar badges; fine to be 60s stale.
4. **`resolveStyle`** — already has `styleResolvedAt` timestamp; use as 7-day TTL gate. Currently re-resolves on every send if called.
5. **`getContactById(id)` / `getCampaignById(id)`** — tag-scoped `contact:${id}`, `campaign:${id}`.

---

## Low — observations not worth a refactor pass

- **`src/generated/prisma/`** memory note is stale — directory is gone. Delete the memory entry.
- **`proxy.ts` at `src/proxy.ts`** — lonely top-level file; either move to `src/lib/proxy.ts` or document the Next 16 middleware convention.
- **`microsoft-graph.ts:267-280`** uses `any` with 3 eslint-disables — type once as `GraphMessage` and drop.
- **`follow-up.ts:155`** embeds LLM prompt inline; move to `lib/ai/prompts.ts` alongside siblings.
- **`sendBulkOutreach`** (`outreach-actions.ts:364-390`) loops serially. At 50 journalists × 1.5s = 75s → Vercel timeout. Add bounded concurrency or enqueue.
- **Inline style objects vs Tailwind** — mixed. Pick one convention and document.
- **`revalidatePath` triples** (`"/campaigns"`, `` `/campaigns/${id}` ``, `"/workspaces"`) repeated ~20 times — folds into the action wrapper's `revalidate` array.
- **`suppressedEmails` prop-drilling** four levels in campaign UI — hoist to `SuppressionContext`.

---

## Patterns done well — keep

- `lib/slug/slugify.ts`, `lib/segments/filter.ts`, `lib/compose/extract-signature.ts`, `lib/templates/render.ts`, `lib/import/csv-parser.ts` — small, focused, pure, tested. Model for future `lib/` work.
- **`lib/queries/` vs `actions/` split** is clean. No query calls `revalidatePath`; no page.tsx imports an action for read-only data.
- **Slug dual-lookup** (`isCuid(handle)`) — one predicate, same route handles both shapes. Apply uniformly.
- **`follow-up.ts`** — provider-agnostic via aligned response shapes, idempotent, gracefully continues on per-outreach failure. This is the shape async code should aspire to.

---

## Recommended execution order

1. **Security hardening sprint (1 week focused work):**
   - A-1: Action wrapper + `requireOrgId()`
   - S-1 through S-6: auth everywhere, scoped queries, API route guards, header-injection, signature sanitization, CSV cap, cron secret fail-closed
   - Covers all Critical findings

2. **Performance sprint (3–4 days):**
   - A-3: CSV import batching
   - A-4: Cron parallelism
   - A-5: Prisma indexes
   - Caching additions (top 5)

3. **Architecture / readability sprint (3–5 days):**
   - A-2: `EmailProvider` interface + rename `conversationId` → `threadId`
   - A-6: Split `sendOutreach`
   - R-1: outlet/publication rename
   - R-2: Field primitive
   - R-3: status enums
   - R-4: split campaign-actions

All three sprints are small-to-medium and each produces measurable improvement. Security must be first — everything else is amplified by the auth fix (scoped queries only make sense when the authz story is real).
