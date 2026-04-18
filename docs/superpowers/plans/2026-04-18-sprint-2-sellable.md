# Sprint 2 — Sellable (no billing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the demo-ready Pressroom app into a sellable product (minus billing) by shipping scheduled outreach, in-app reply reading, filterable dashboard, fuzzy import dedup, and clearing remaining Sprint 1 follow-ups.

**Architecture:** Four vertical features on the existing Next.js 16 App Router + Prisma/Neon + provider-abstracted email stack (`src/lib/email/provider.ts` with `gmail-provider.ts` and `microsoft-provider.ts`). Scheduling is a new Vercel cron that uses an atomic `claimedAt` column to avoid double-sends. Reply bodies extend the provider interface to return full body, persisted in a new `Reply` model. Dashboard v2 adds URL-driven filters + aggregate queries with `Prisma.sql` parameterization. Fuzzy dedup is a pure bucketed function used during the existing contact importer pre-flight.

**Tech Stack:** Next.js 16, TypeScript, Prisma 6 + Neon Postgres, Microsoft Graph + Gmail, Vercel Cron, Tailwind v4 + shadcn, Vitest.

---

## Current state (as of 2026-04-18 — main has advanced since the first draft)

- **Task 0 is effectively done.** All outreach server actions in `src/actions/outreach-actions.ts` now call `requireOrgId()` (from `@/lib/server/org`) and scope their `db.outreach.findFirst` by `{campaign: {organizationId: orgId}}`. `sendOutreach` is already split into `loadSendableOutreach`, `sendViaProvider`, `markOutreachSent`, etc. `CRON_SECRET` is fail-closed in prod with a dev-only warn-and-allow branch. Task 0 in the original plan is therefore a no-op; skip it.
- **Enums are real:** `OutreachStatus`, `CampaignStatus`, `SupplierStatus`, `CampaignContactStatus`, `PhaseStatus`. Never store free-form strings in those columns.
- **Name changes:** `Outreach.conversationId` → `threadId`. `Contact.publication` → `outlet`.
- **Provider abstraction:** replies are fetched via `providerFor(account).getReplies(token, threadId, after)` returning `{ id, threadId, from, receivedDateTime, subject, bodyPreview }` (no body). Task 2 must extend this interface, not bypass it.
- **Already in place:** `Outreach.lastCheckedForReplyAt`, `Outreach.scheduledAt`, `Suppression` model + suppression check, concurrency batching in `checkForReplies`, `getCurrentOrg` request-cache, `stats:${orgId}` revalidate-tag convention.
- **Test framework:** Vitest is configured (`vitest.config.ts`, `npm run test`). Prefer TDD for new pure logic (fuzzy dedup, reply HTML stripping, scheduling-claim query). UI & Next.js routes stay on lint/build + manual verification.
- **Authorization pattern for actions:** the codebase uses a wrapper `action("name", async (...) => { ... })` in `src/lib/server/action.ts`. Follow that pattern for any new server action — it centralizes `revalidate` / `revalidateTags` returns and error shaping.

---

## Pre-flight security & perf concerns baked into this plan

1. **New scheduling cron must not double-fire.** Use an atomic two-step claim with a new `Outreach.claimedAt` timestamp + predicate (`status = approved AND scheduledAt <= now() AND claimedAt IS NULL`). Task 1.
2. **Cron has no session — `sendOutreach` requires one.** Extract `sendOutreachForOrg(outreachId, orgId)` (no session read); `sendOutreach` wraps it after `requireOrgId()`. Task 1.
3. **Reply body storage must not render inbound HTML.** Store `bodyText` + optional `bodyHtml`; UI renders text only (no `dangerouslySetInnerHTML`). Task 2.
4. **Log PII-free.** `console.error('checkForReplies failed', outreach.id)` — ids only. Already partly followed on main; do not regress.
5. **Dashboard filter params are user-controlled.** Only through Prisma typed inputs or `Prisma.sql` tagged templates. Never string-interpolate. Task 3.
6. **Fuzzy dedup O(N·M) avoided** via outlet + first-letter bucketing + early-exit Levenshtein. Task 4.
7. **`npm audit`** has a moderate advisory on `isomorphic-dompurify`. Task 5.

---

## File structure

**New files:**
- `src/app/api/cron/send-scheduled/route.ts` — new cron endpoint.
- `src/lib/outreach/schedule.ts` — atomic-claim logic + `sendOutreachForOrg` helper.
- `src/lib/outreach/schedule.test.ts` — vitest unit tests.
- `src/lib/email/reply-body.ts` — pure HTML→text + quoted-reply stripping.
- `src/lib/email/reply-body.test.ts`
- `src/lib/contacts/fuzzy-dedup.ts` — pure bucketed dedup.
- `src/lib/contacts/fuzzy-dedup.test.ts`
- `src/lib/queries/dashboard-metrics.ts`
- `src/components/dashboard/filters.tsx`
- `src/components/outreach/schedule-modal.tsx`

**Modified files:**
- `prisma/schema.prisma` — `Outreach.claimedAt`, `Reply` model, indexes.
- `vercel.json` — new cron entry.
- `src/actions/outreach-actions.ts` — add `scheduleOutreach` action + export `sendOutreachForOrg`.
- `src/lib/email/provider.ts` — extend `Reply` type with `body` fields, or add `getRepliesWithBody`.
- `src/lib/email/microsoft-graph.ts`, `src/lib/email/gmail.ts`, `src/lib/email/microsoft-provider.ts`, `src/lib/email/gmail-provider.ts` — return reply bodies.
- `src/lib/email/follow-up.ts` — upsert `Reply` rows.
- `src/app/(app)/page.tsx` — dashboard v2.
- `src/components/campaigns/outreach-send-card.tsx` — Schedule button + reply preview.
- Contact importer pre-flight (grep `import.*contact` + `preview` to find it).

---

## Task 1: Outreach scheduling worker

**Files:**
- Create: `src/app/api/cron/send-scheduled/route.ts`
- Create: `src/lib/outreach/schedule.ts`, `schedule.test.ts`
- Create: `src/components/outreach/schedule-modal.tsx`
- Modify: `prisma/schema.prisma` (add `claimedAt DateTime?`, `@@index([status, scheduledAt, claimedAt])`)
- Modify: `src/actions/outreach-actions.ts` (`scheduleOutreach` + `sendOutreachForOrg`)
- Modify: `vercel.json`

- [ ] **Step 1.1: Schema migration**

In `prisma/schema.prisma`, inside `model Outreach { ... }`:

```prisma
  claimedAt DateTime?

  @@index([status, scheduledAt, claimedAt])
  @@index([threadId])
```

(Keep existing fields and indexes; add these.) Run: `npx prisma migrate dev --name outreach_scheduling_claim` — NOT `prisma db push`.

- [ ] **Step 1.2: Extract `sendOutreachForOrg` (no session)**

In `src/actions/outreach-actions.ts`, refactor `sendOutreach` so the actual work is in a new exported helper:

```ts
export async function sendOutreachForOrg(outreachId: string, orgId: string) {
  const outreach = await loadSendableOutreach(outreachId, orgId);
  await assertNotSuppressed(outreach, orgId);
  const account = await requireEmailAccount(outreach.campaign.organizationId);
  const bodyHtml = renderOutreachHtml(outreach.body, account);
  const sent = await sendViaProvider(account, {
    to: outreach.contact.email!,
    subject: outreach.subject,
    bodyHtml,
  });
  await markOutreachSent(outreach.id, account.provider, sent);
  await logSentInteraction(outreach);
  return {
    revalidate: [`/campaigns/${outreach.campaignId}`, "/outreach"],
    revalidateTags: [
      `campaign:${outreach.campaignId}`,
      `contact:${outreach.contactId}`,
      `stats:${orgId}`,
    ],
  };
}

export const sendOutreach = action("sendOutreach", async (outreachId: string) => {
  const orgId = await requireOrgId();
  return sendOutreachForOrg(outreachId, orgId);
});
```

- [ ] **Step 1.3: `scheduleOutreach` server action**

```ts
export const scheduleOutreach = action(
  "scheduleOutreach",
  async (outreachId: string, scheduledAtIso: string) => {
    const orgId = await requireOrgId();
    const scheduledAt = new Date(scheduledAtIso);
    if (!isFinite(+scheduledAt) || scheduledAt <= new Date()) {
      throw new Error("Scheduled time must be a valid future date");
    }
    const existing = await db.outreach.findFirst({
      where: { id: outreachId, campaign: { organizationId: orgId } },
      select: { campaignId: true, contactId: true },
    });
    if (!existing) throw new Error("Outreach not found");
    await db.outreach.update({
      where: { id: outreachId },
      data: { status: OutreachStatus.approved, scheduledAt, claimedAt: null },
    });
    return {
      revalidate: [`/campaigns/${existing.campaignId}`],
      revalidateTags: [`campaign:${existing.campaignId}`],
    };
  }
);
```

- [ ] **Step 1.4: Atomic claim helper**

Create `src/lib/outreach/schedule.ts`:

```ts
import { db } from "@/lib/db";
import { OutreachStatus } from "@prisma/client";

/**
 * Atomically claim due outreaches for sending. Stamps claimedAt = now on
 * matching rows in ONE UPDATE, then returns the claimed ids + their orgIds.
 * Two overlapping cron runs cannot claim the same row.
 */
export async function claimDueOutreaches(now: Date, limit = 50): Promise<Array<{ id: string; orgId: string }>> {
  // Use a transaction: UPDATE ... RETURNING pattern via $queryRaw.
  // Prisma's updateMany doesn't return rows on Postgres.
  const rows = await db.$queryRaw<Array<{ id: string; orgId: string }>>`
    UPDATE "Outreach" o
    SET "claimedAt" = ${now}
    FROM "Campaign" c
    WHERE o.id IN (
      SELECT o2.id FROM "Outreach" o2
      WHERE o2.status = ${OutreachStatus.approved}::"OutreachStatus"
        AND o2."scheduledAt" IS NOT NULL
        AND o2."scheduledAt" <= ${now}
        AND o2."claimedAt" IS NULL
      ORDER BY o2."scheduledAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    AND o."campaignId" = c.id
    RETURNING o.id AS id, c."organizationId" AS "orgId"
  `;
  return rows;
}
```

`FOR UPDATE SKIP LOCKED` is critical: it prevents two simultaneous cron runs from racing on the same row.

- [ ] **Step 1.5: Tests for the claim helper**

`src/lib/outreach/schedule.test.ts` — use Prisma test helpers if any exist; otherwise skip DB tests and test only pure helpers. Grep the repo for an existing test-DB pattern (`rg "beforeEach|createTestOrg" src/**/*.test.ts`) before assuming one exists. If none, note it as DONE_WITH_CONCERNS and move on — don't invent a test infra.

- [ ] **Step 1.6: Cron route**

`src/app/api/cron/send-scheduled/route.ts`:

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claimDueOutreaches } from "@/lib/outreach/schedule";
import { sendOutreachForOrg } from "@/actions/outreach-actions";
import { OutreachStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[cron/send-scheduled] CRON_SECRET not set — allowing in dev only");
    } else {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
  } else {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const claimed = await claimDueOutreaches(now);
  let sent = 0;
  let failed = 0;

  for (const row of claimed) {
    try {
      await sendOutreachForOrg(row.id, row.orgId);
      sent++;
    } catch (err) {
      failed++;
      console.error(`[cron/send-scheduled] ${row.id} failed`);
      // Release claim so next run can retry; keep status=approved.
      await db.outreach.update({ where: { id: row.id }, data: { claimedAt: null } }).catch(() => {});
    }
  }

  return NextResponse.json({ claimed: claimed.length, sent, failed, at: now });
}
```

Mirror the `CRON_SECRET` guard style from `check-replies/route.ts` for consistency.

- [ ] **Step 1.7: Register cron**

`vercel.json`:

```json
{
  "regions": ["syd1"],
  "crons": [
    { "path": "/api/cron/check-replies", "schedule": "0 8 * * *" },
    { "path": "/api/cron/send-scheduled", "schedule": "*/5 * * * *" }
  ]
}
```

- [ ] **Step 1.8: UI — Schedule modal**

Create `src/components/outreach/schedule-modal.tsx` (centered modal per `feedback_modal_over_route.md`). Datetime-local input, `min` set to `now + 1 minute`, calls `scheduleOutreach(outreachId, input.toISOString())`. In `src/components/campaigns/outreach-send-card.tsx` add a "Schedule" button next to "Send now" that opens the modal. Render `scheduledAt` on the card when present ("Scheduled for {date}" + a "Cancel schedule" action that clears `scheduledAt` and reverts status to draft or approved-without-schedule — whichever reads more cleanly).

- [ ] **Step 1.9: Verify**

```bash
npm run lint && npm run build && npm run test
```

Manual: approve an outreach, schedule it for 1 minute in the future, wait, hit the cron URL locally with bearer, confirm it sends. Re-hit: claimed=0.

- [ ] **Step 1.10: Commit per logical chunk (schema, action, cron, UI). Final:**

```bash
git commit -m "feat(outreach): scheduled send worker with atomic claim"
```

---

## Task 2: Reply body extraction

**Files:**
- Modify: `prisma/schema.prisma` (add `Reply` model + relation)
- Create: `src/lib/email/reply-body.ts`, `reply-body.test.ts`
- Modify: `src/lib/email/provider.ts` (extend `Reply` type or add `bodyText`, `bodyHtml` fields)
- Modify: `src/lib/email/microsoft-graph.ts` (include `body` in `$select`, return it)
- Modify: `src/lib/email/gmail.ts` (decode `payload.body.data` base64url)
- Modify: `src/lib/email/microsoft-provider.ts`, `gmail-provider.ts` — thread the body through
- Modify: `src/lib/email/follow-up.ts` — upsert `Reply` rows
- Modify: `src/components/campaigns/outreach-send-card.tsx` — render reply list

- [ ] **Step 2.1: `Reply` model**

```prisma
model Reply {
  id             String   @id @default(cuid())
  outreachId     String
  outreach       Outreach @relation(fields: [outreachId], references: [id], onDelete: Cascade)
  providerMessageId String
  fromEmail      String
  fromName       String?
  receivedAt     DateTime
  subject        String?
  bodyText       String   @db.Text
  bodyHtml       String?  @db.Text
  createdAt      DateTime @default(now())

  @@unique([outreachId, providerMessageId])
  @@index([outreachId])
}
```

Add `replies Reply[]` relation on `Outreach`. Run: `npx prisma migrate dev --name add_reply_model`.

- [ ] **Step 2.2: Pure HTML→text helpers**

Create `src/lib/email/reply-body.ts`:

```ts
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripQuotedReply(text: string): string {
  const markers = [
    /\n-----Original Message-----[\s\S]*$/,
    /\nOn .{0,80} wrote:[\s\S]*$/,
    /\nFrom: .+\nSent: .+[\s\S]*$/,
  ];
  let result = text;
  for (const m of markers) result = result.replace(m, "");
  return result.trim();
}
```

Add vitest tests in `reply-body.test.ts` covering: HTML entities, quoted-reply stripping for Outlook and Gmail formats, empty-string.

- [ ] **Step 2.3: Extend provider Reply type**

In `src/lib/email/provider.ts`, extend the `Reply` type to include `bodyText: string` and `bodyHtml: string | null`. Bump the interface to require providers to populate them. (Implementations update in 2.4 / 2.5.)

- [ ] **Step 2.4: Microsoft Graph — return body**

In `src/lib/email/microsoft-graph.ts` add `body` to the `$select`, pull `message.body.content` + `message.body.contentType`, and return `{ ...existingFields, bodyText, bodyHtml }` via `htmlToText` + `stripQuotedReply`. Reject `threadId` containing `'` before interpolating into `$filter`.

- [ ] **Step 2.5: Gmail — return body**

In `src/lib/email/gmail.ts`, the Gmail message `payload` has nested MIME parts. Walk the tree, find the first `text/plain` part (`part.body.data`, base64url decode) and optional `text/html`. Return both. If only HTML is present, run it through `htmlToText`. Always run the final text through `stripQuotedReply`.

- [ ] **Step 2.6: Persist replies in `checkForReplies`**

In `src/lib/email/follow-up.ts`'s `checkOne`, after fetching replies, upsert each:

```ts
for (const reply of replies) {
  await db.reply.upsert({
    where: {
      outreachId_providerMessageId: {
        outreachId: outreach.id,
        providerMessageId: reply.id,
      },
    },
    create: {
      outreachId: outreach.id,
      providerMessageId: reply.id,
      fromEmail: reply.from.emailAddress.address,
      fromName: reply.from.emailAddress.name ?? null,
      receivedAt: new Date(reply.receivedDateTime),
      subject: reply.subject,
      bodyText: reply.bodyText,
      bodyHtml: reply.bodyHtml,
    },
    update: {},
  });
}
```

Guard the existing status-flip + interaction-create so it only runs when transitioning from `sent` → `replied` the first time (check `outreach.status !== OutreachStatus.replied`).

- [ ] **Step 2.7: Render replies on the send card**

Update the query that feeds `outreach-send-card.tsx` to `include: { replies: { orderBy: { receivedAt: "asc" } } }`. In the component, when `outreach.status === "replied"`, render each reply: sender (`fromName` or `fromEmail`), received time, `<pre className="whitespace-pre-wrap">{reply.bodyText}</pre>`. No raw HTML render.

- [ ] **Step 2.8: Verify**

```bash
npm run lint && npm run build && npm run test && npx prisma validate
```

Manual: send to a mailbox you control, reply, hit `/api/cron/check-replies`, confirm reply renders as plaintext in the campaign.

- [ ] **Step 2.9: Commit**

`feat(email): persist reply bodies and render in campaign`

---

## Task 3: Dashboard v2 with filters

**Files:**
- Create: `src/lib/queries/dashboard-metrics.ts`
- Create: `src/components/dashboard/filters.tsx`
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 3.1: `getDashboardMetrics`**

```ts
import { db } from "@/lib/db";
import { requireOrgId } from "@/lib/server/org";
import { OutreachStatus, Prisma } from "@prisma/client";

export type DashboardFilters = { from?: Date; to?: Date; clientId?: string };

export async function getDashboardMetrics(filters: DashboardFilters) {
  const orgId = await requireOrgId();
  const { from, to, clientId } = filters;

  const campaignFilter: Prisma.CampaignWhereInput = {
    organizationId: orgId,
    ...(clientId ? { clientId } : {}),
  };
  const outreachWhere: Prisma.OutreachWhereInput = {
    campaign: campaignFilter,
    ...(from || to
      ? { sentAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const [sent, replied, coverages, byDay] = await Promise.all([
    db.outreach.count({ where: { ...outreachWhere, status: OutreachStatus.sent } }),
    db.outreach.count({ where: { ...outreachWhere, status: OutreachStatus.replied } }),
    db.coverage.count({
      where: {
        organizationId: orgId,
        ...(clientId ? { campaign: { clientId } } : {}),
        ...(from || to
          ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
    }),
    db.$queryRaw<Array<{ day: Date; sent_count: bigint; replied_count: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', o."sentAt") AS day,
             COUNT(*) FILTER (WHERE o.status = 'sent'::"OutreachStatus")    AS sent_count,
             COUNT(*) FILTER (WHERE o.status = 'replied'::"OutreachStatus") AS replied_count
      FROM "Outreach" o
      JOIN "Campaign" c ON c.id = o."campaignId"
      WHERE c."organizationId" = ${orgId}
        ${clientId ? Prisma.sql`AND c."clientId" = ${clientId}` : Prisma.empty}
        ${from ? Prisma.sql`AND o."sentAt" >= ${from}` : Prisma.empty}
        ${to ? Prisma.sql`AND o."sentAt" <= ${to}` : Prisma.empty}
        AND o."sentAt" IS NOT NULL
      GROUP BY day
      ORDER BY day ASC
    `),
  ]);

  return {
    sent,
    replied,
    coverages,
    byDay: byDay.map((r) => ({
      day: r.day,
      sent: Number(r.sent_count),
      replied: Number(r.replied_count),
    })),
  };
}
```

**SQL-injection note:** every value is passed via `${...}` inside `Prisma.sql`, which parameterizes. Do not switch to string concatenation. `Prisma.empty` is the no-op.

- [ ] **Step 3.2: Filter bar**

`src/components/dashboard/filters.tsx` — client component. Date range (from/to as `YYYY-MM-DD`), client dropdown sourced via prop (server fetches clients and passes in), "Clear" button. On change, push to URL search params (`router.replace`). No local state for filters — URL is the source of truth.

- [ ] **Step 3.3: Dashboard page**

```tsx
// src/app/(app)/page.tsx
import { getDashboardMetrics } from "@/lib/queries/dashboard-metrics";
import { requireOrgId } from "@/lib/server/org";
import { db } from "@/lib/db";
import { DashboardFilters } from "@/components/dashboard/filters";

export default async function DashboardPage({
  searchParams,
}: { searchParams: Promise<{ from?: string; to?: string; clientId?: string }> }) {
  const sp = await searchParams;
  const filters = {
    from: parseDate(sp.from),
    to: parseDate(sp.to),
    clientId: sp.clientId,
  };
  const orgId = await requireOrgId();
  const [metrics, clients] = await Promise.all([
    getDashboardMetrics(filters),
    db.client.findMany({
      where: { organizationId: orgId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <DashboardFilters clients={clients} initial={{ from: sp.from, to: sp.to, clientId: sp.clientId }} />
      {/* metric cards + trend SVG using metrics.byDay */}
    </div>
  );
}

function parseDate(v: string | undefined): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isFinite(+d) ? d : undefined;
}
```

**Next.js 16 note:** `searchParams` is a Promise — `await` it. Confirm with `node_modules/next/dist/docs/` per `AGENTS.md` before writing.

- [ ] **Step 3.4: Trend chart (no new deps)**

Render two SVG `<path>` elements over the `byDay` data (sent + replied). Width 100%, height ~200px, fixed viewBox scaled by max value. Skip chart libraries.

- [ ] **Step 3.5: Verify**

```bash
npm run lint && npm run build
```

Manual: change date range + client, check URL params and counts. Bookmark a filtered URL and reload — persists.

- [ ] **Step 3.6: Commit** — `feat(dashboard): v2 with date and client filters`

---

## Task 4: Fuzzy contact dedup on import

**Files:**
- Create: `src/lib/contacts/fuzzy-dedup.ts`, `fuzzy-dedup.test.ts`
- Modify: the import pre-flight (grep `rg "importContacts|contact.*import" src -l`)

- [ ] **Step 4.1: Pure dedup**

`src/lib/contacts/fuzzy-dedup.ts`:

```ts
export type DedupContact = { name: string; email?: string | null; outlet?: string | null };
export type Match = { incomingIndex: number; matchId: string; reason: "email" | "fuzzy-name-outlet" };

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function levenshtein(a: string, b: string, maxDist: number): number {
  if (Math.abs(a.length - b.length) > maxDist) return Infinity;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return Infinity;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function findFuzzyMatches(
  incoming: DedupContact[],
  existing: Array<DedupContact & { id: string }>,
): Match[] {
  const results: Match[] = [];
  const byEmail = new Map<string, string>();
  for (const e of existing) {
    const em = norm(e.email);
    if (em) byEmail.set(em, e.id);
  }

  const buckets = new Map<string, Array<DedupContact & { id: string }>>();
  for (const e of existing) {
    const key = `${norm(e.outlet)}|${norm(e.name).charAt(0)}`;
    const arr = buckets.get(key) ?? [];
    arr.push(e);
    buckets.set(key, arr);
  }

  for (let i = 0; i < incoming.length; i++) {
    const c = incoming[i];
    const em = norm(c.email);
    if (em && byEmail.has(em)) {
      results.push({ incomingIndex: i, matchId: byEmail.get(em)!, reason: "email" });
      continue;
    }
    const cName = norm(c.name);
    if (!cName) continue;
    const key = `${norm(c.outlet)}|${cName.charAt(0)}`;
    const candidates = buckets.get(key) ?? [];
    const threshold = Math.max(2, Math.floor(cName.length * 0.2));
    for (const cand of candidates) {
      const dist = levenshtein(cName, norm(cand.name), threshold);
      if (dist <= threshold) {
        results.push({ incomingIndex: i, matchId: cand.id, reason: "fuzzy-name-outlet" });
        break;
      }
    }
  }
  return results;
}
```

- [ ] **Step 4.2: Tests**

`fuzzy-dedup.test.ts` covering: exact email wins over fuzzy name; "Jon Smith" matches "Jonathan Smith" at same outlet; "John Smith" at different outlet does not match; empty names skipped; large input (1000×1000) runs < 200ms locally (soft check via `performance.now()`, no brittle asserts on exact ms).

- [ ] **Step 4.3: Wire into importer pre-flight**

Grep `rg "csv|preview|import" src/app/(app)/contacts -l` and `src/components`. In the pre-flight step, fetch existing contacts (`select: { id, name, email, outlet }`) and pass into `findFuzzyMatches`. Render each match with a "Merge into existing" / "Create new" choice. Default "Merge" for `email`, default "Create new" (but highlighted) for `fuzzy-name-outlet`.

- [ ] **Step 4.4: Verify** — `npm run lint && npm run build && npm run test`

- [ ] **Step 4.5: Commit** — `feat(contacts): fuzzy dedup on import with outlet bucketing`

---

## Task 5: Remaining Sprint 1 follow-ups

**Grep before each step — some may already be done.**

- [ ] **Step 5.1: `<Field>` primitive rollout**

Run: `rg "<Field" src/components -l`. Files still raw: likely `runsheet-editor.tsx`, `supplier-tabs.tsx`, `event-detail-client.tsx`, `template-form.tsx`. Replace raw `label/input` pairs with `<Field>`, matching the API in `contact-form.tsx`. Commit: `refactor(ui): roll out Field primitive to remaining forms`.

- [ ] **Step 5.2: `npm audit fix`**

```bash
npm audit --production
npm audit fix
```

Do not `--force` without reading the advisory. If unfixable without breaking change, leave it with a commit body note. Commit: `chore(deps): npm audit fix`.

- [ ] **Step 5.3: Confirm supplier status typo**

Grep `rg "SupplierStatus|CampaignSupplier.*status" src -n`. With the SupplierStatus enum now on main, `?? "active"` either won't compile or is explicitly intentional. If it compiles, check whether `"active"` is in the enum. If not, change to the correct default — likely `SupplierStatus.pending`. Commit only if something actually changed.

- [ ] **Step 5.4: Contacts page JSON type fix**

Open `src/app/(app)/contacts/[contactId]/page.tsx`. If `JSON.parse(JSON.stringify(contact))` is still there, replace with typed serialization:

```ts
const contactForClient = {
  ...contact,
  createdAt: contact.createdAt.toISOString(),
  outlet: contact.outlet ?? null,
};
```

Commit only if something changed.

---

## Self-review checklist

- [ ] All new DB writes use `OutreachStatus` enum values, never string literals.
- [ ] Every `$filter` / `$queryRaw` goes through parameterization.
- [ ] No `dangerouslySetInnerHTML` added anywhere in this sprint.
- [ ] Cron routes mirror the `check-replies` auth pattern exactly.
- [ ] `prisma migrate dev` used for every schema change (never `db push`).
- [ ] `npm run lint && npm run build && npm run test` all green before final commit.
- [ ] No PII-bearing `console.error(..., obj)` added.

---

## Execution handoff — SUBAGENT-DRIVEN

Task 1 must ship first (schema adds a column Task 2 doesn't care about, but migrations should land sequentially). Task 2 depends on Task 1's schema migration. Tasks 3 and 4 are independent of each other and of 1/2 after the schemas are settled. Task 5 last.
