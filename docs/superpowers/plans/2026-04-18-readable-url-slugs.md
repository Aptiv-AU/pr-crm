# Readable URL Slugs — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute.

**Goal:** Replace cuid-based URLs (`/contacts/clxxxxxxxxxxxx`) with human-readable slugs (`/contacts/jane-doe`) across all user-visible entity routes, without breaking existing bookmarked URLs.

**Architecture:** Add a unique `slug` column to each exposed entity (Contact, Supplier, Client, Campaign, Coverage). Backfill existing rows with a deterministic SQL script inside the migration. Route handlers gain a dual-lookup helper that tries cuid first, falls back to slug-per-org. Forward-looking writes (create, update) maintain slugs. Slugs are stable across renames — the URL you emailed someone last month still works even if the contact's name changed.

**Tech Stack:** Prisma 6, Postgres (Neon), Next.js 16 App Router dynamic routes.

---

## Design decisions

### Slug format
- Lowercase ASCII, hyphens, digits. Strip diacritics via NFKD normalisation.
- Max length 60 characters (fits URL bars, fits Prisma unique index comfortably).
- On collision within an organization, append `-2`, `-3`, etc. — predictable, not random.

### Uniqueness scope
- Contact, Supplier, Client → unique per `organizationId`.
- Campaign → unique per `organizationId` (not per-client — URLs don't include client context; per-org keeps `/campaigns/foo` globally distinct).
- Coverage → unique per `organizationId` (coverage titles get disambiguated across clients if needed).

### Route-param semantics
- We keep existing param names: `[contactId]`, `[campaignId]`, etc. The *value* in the param is either a cuid OR a slug; a resolver in the page decides.
- Cuid detection: `/^c[a-z0-9]{20,}$/`. If matches, look up by id. Otherwise look up by (orgId, slug).
- This means old bookmarks (cuid URLs) still resolve forever. New URLs issued by the app use the slug.

### Rename policy
- Slug is set at create-time and **never auto-changes** on rename. A future "regenerate slug" admin action can be added if needed.
- Rationale: URL stability for emailed/shared links > matching the current display name.

### Backfill strategy
- Single migration SQL: add column nullable → populate with `UPDATE ... SET slug = <expr>` using `ROW_NUMBER()` for disambiguation → `ALTER ... SET NOT NULL` → `CREATE UNIQUE INDEX`.
- Slugify in SQL is imperfect (can't strip diacritics as cleanly). Acceptable — messy edge cases become `-2` etc. Fixable after deploy if needed.

---

## File structure

### New
- `src/lib/slug/slugify.ts` — pure `slugify` + `ensureUniqueSlug` helpers + tests
- `src/lib/slug/resolve.ts` — pure `isCuid` helper + tests (route resolvers stay in pages)

### Modified (schema + migration)
- `prisma/schema.prisma` — add `slug` to Contact, Supplier, Client, Campaign, Coverage
- `prisma/migrations/<timestamp>_add_entity_slugs/migration.sql`

### Modified (actions — generate slug on create)
- `src/actions/contact-actions.ts` — `createContact`
- `src/actions/import-actions.ts` — `importContacts`
- `src/actions/*` — any other create action that inserts the five entities

### Modified (route pages — dual-lookup)
- `src/app/(app)/contacts/[contactId]/page.tsx`
- `src/app/(app)/campaigns/[campaignId]/page.tsx`
- `src/app/(app)/suppliers/[supplierId]/page.tsx`
- `src/app/(app)/workspaces/[clientId]/page.tsx`
- `src/app/(app)/coverage/[coverageId]/page.tsx`
- `src/app/(app)/events/[campaignId]/page.tsx`

### Modified (components that build URLs)
- Every `Link href={\`/contacts/${id}\`}` and equivalent across `src/components/**` and `src/app/**` — replace `.id` with `.slug`.

---

## Task 0: Slug utility (pure, tested)

**Files:**
- Create: `src/lib/slug/slugify.ts`
- Create: `src/lib/slug/slugify.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { slugify, ensureUniqueSlug } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Jane Doe")).toBe("jane-doe");
  });
  it("strips diacritics", () => {
    expect(slugify("Café Chloé")).toBe("cafe-chloe");
  });
  it("drops non-alphanumeric chars", () => {
    expect(slugify("Smith & Co. — 2026!")).toBe("smith-co-2026");
  });
  it("collapses runs of hyphens and whitespace", () => {
    expect(slugify("  a  —  b ")).toBe("a-b");
  });
  it("caps length at 60", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBe(60);
  });
  it("returns empty string for all-unsupported input", () => {
    expect(slugify("—?!")).toBe("");
  });
});

describe("ensureUniqueSlug", () => {
  it("returns base when not taken", async () => {
    const taken = new Set<string>();
    const slug = await ensureUniqueSlug("jane-doe", (s) => Promise.resolve(taken.has(s)));
    expect(slug).toBe("jane-doe");
  });
  it("appends -2, -3 on collision", async () => {
    const taken = new Set(["jane-doe", "jane-doe-2"]);
    const slug = await ensureUniqueSlug("jane-doe", (s) => Promise.resolve(taken.has(s)));
    expect(slug).toBe("jane-doe-3");
  });
  it("falls back to 'item' if base is empty", async () => {
    const slug = await ensureUniqueSlug("", () => Promise.resolve(false));
    expect(slug).toBe("item");
  });
});
```

- [ ] **Step 2: Verify they fail**

```bash
npm test
```

Expected: failures on undefined `slugify`, `ensureUniqueSlug`.

- [ ] **Step 3: Implement**

```ts
const MAX_LENGTH = 60;

export function slugify(input: string): string {
  const normalised = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const collapsed = normalised
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return collapsed.slice(0, MAX_LENGTH).replace(/-+$/g, "");
}

export async function ensureUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const seed = base || "item";
  if (!(await exists(seed))) return seed;
  let n = 2;
  while (true) {
    const candidate = `${seed}-${n}`;
    if (!(await exists(candidate))) return candidate;
    n++;
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: new tests pass. Existing 24 unchanged.

- [ ] **Step 5: Commit**

```bash
git -c commit.gpgsign=false commit -am "feat(slug): pure slugify + unique-resolver with tests"
```

---

## Task 1: Cuid-vs-slug resolver (pure, tested)

**Files:**
- Create: `src/lib/slug/resolve.ts`
- Create: `src/lib/slug/resolve.test.ts`

- [ ] **Step 1: Tests**

```ts
import { describe, it, expect } from "vitest";
import { isCuid } from "./resolve";

describe("isCuid", () => {
  it("recognises real cuids", () => {
    expect(isCuid("ckwabcdef0123456789abcd")).toBe(true);
  });
  it("rejects slugs", () => {
    expect(isCuid("jane-doe")).toBe(false);
    expect(isCuid("acme-ss26-launch")).toBe(false);
  });
  it("rejects empty / short strings", () => {
    expect(isCuid("")).toBe(false);
    expect(isCuid("c123")).toBe(false);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// Prisma cuid() default: "c" + 24 chars (some libs use cuid2 which is lowercase alnum only and ~24-32 chars)
const CUID_RE = /^c[a-z0-9]{20,}$/;

export function isCuid(value: string): boolean {
  return CUID_RE.test(value);
}
```

- [ ] **Step 3: Commit**

```bash
git -c commit.gpgsign=false commit -am "feat(slug): cuid detection helper"
```

---

## Task 2: Schema + backfill migration

**Files:**
- Modify: `prisma/schema.prisma` — add `slug String` (initially unset in schema; we'll make it required in schema only *after* backfill — but Prisma prefers a single migration, so we make it required in schema now and populate via raw SQL in the migration file itself)

**Approach:** write schema with `slug String` already required and `@@unique([organizationId, slug])`. Use `prisma migrate dev --create-only` to generate the migration skeleton. Hand-edit the SQL to: add nullable → backfill → not-null → index.

- [ ] **Step 1: Add slug fields to schema**

For each of Contact, Supplier, Client, Campaign, Coverage, add:

```prisma
slug String
```

And at the end of each model:

```prisma
@@unique([organizationId, slug])
```

Campaign has `clientId` not `organizationId` directly — denormalise via a separate `@@index([organizationId, slug])` if needed, OR keep the unique constraint on `(clientId, slug)`. **Decision:** use `(organizationId, slug)` so the URL resolver can look up by orgId + slug without a client scope. This means Campaign needs to carry `organizationId` — it already does via `campaign.client.organizationId`. **Simplest path:** add `organizationId String` directly on Campaign (denormalised, kept in sync via the create action), and Coverage too. If this is a big schema change, fall back to `(clientId, slug)` and change the URL pattern to include client slug. Evaluate when touching the schema.

- [ ] **Step 2: Create migration skeleton**

```bash
npx prisma migrate dev --create-only --name add_entity_slugs
```

- [ ] **Step 3: Hand-edit the generated migration SQL to**:

1. Drop the failing `NOT NULL` and unique constraint clauses the generator produced.
2. Add columns as nullable first.
3. Backfill with a CTE + UPDATE using `ROW_NUMBER()`:

```sql
-- Example for Contact (repeat for each table):
ALTER TABLE "Contact" ADD COLUMN "slug" TEXT;

WITH ranked AS (
  SELECT
    id,
    "organizationId",
    LOWER(REGEXP_REPLACE(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(unaccent(COALESCE(NULLIF("name", ''), 'item'))), '[^a-z0-9]+', '-', 'g')), '-+', '-', 'g')) AS base_slug,
    ROW_NUMBER() OVER (PARTITION BY "organizationId", LOWER(REGEXP_REPLACE(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(unaccent(COALESCE(NULLIF("name", ''), 'item'))), '[^a-z0-9]+', '-', 'g')), '-+', '-', 'g')) ORDER BY "createdAt", id) AS rn
  FROM "Contact"
)
UPDATE "Contact" SET "slug" = CASE
  WHEN r.rn = 1 THEN SUBSTRING(r.base_slug, 1, 60)
  ELSE SUBSTRING(r.base_slug, 1, 55) || '-' || r.rn::TEXT
END
FROM ranked r
WHERE "Contact".id = r.id;

ALTER TABLE "Contact" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Contact_organizationId_slug_key" ON "Contact"("organizationId", "slug");
```

Repeat for `Supplier`, `Client`, `Campaign`, `Coverage`. For Campaign and Coverage, you need to either:
- Denormalise `organizationId` onto the table first (join through to derive it in the CTE), OR
- Use `(clientId, slug)` or `(campaignId, slug)` unique scope (alternative decision)

**Decision path:** use denormalised `organizationId` on Campaign and Coverage. Include the denormalisation in the migration SQL: `ALTER TABLE "Campaign" ADD COLUMN "organizationId" TEXT; UPDATE "Campaign" c SET "organizationId" = cl."organizationId" FROM "Client" cl WHERE cl.id = c."clientId"; ALTER TABLE "Campaign" ALTER COLUMN "organizationId" SET NOT NULL; ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"(id);` — mirror for Coverage.

**Caveat on unaccent():** Postgres needs the `unaccent` extension enabled. If not available on Neon by default, use a simpler regex-only slugify in SQL (diacritics pass through as non-alphanumeric and get replaced with `-`). Check first: `SELECT * FROM pg_extension WHERE extname = 'unaccent';` — if empty, add `CREATE EXTENSION IF NOT EXISTS unaccent;` at the top of the migration.

- [ ] **Step 4: Apply the migration**

```bash
npx prisma migrate dev
```

- [ ] **Step 5: Verify backfill**

```bash
npx prisma studio &
# Spot-check 3 contacts, 2 campaigns for readable slugs. Close studio.

# Or via psql:
# SELECT id, name, slug FROM "Contact" LIMIT 5;
```

- [ ] **Step 6: Regenerate client and commit**

```bash
npx prisma generate
git -c commit.gpgsign=false commit -am "feat(db): add slug columns with deterministic backfill"
```

---

## Task 3: Generate slugs on entity creation

**Files:**
- Modify: `src/actions/contact-actions.ts` (`createContact`)
- Modify: `src/actions/import-actions.ts` (`importContacts` — generate slug per new contact)
- Modify: any `supplier-actions`, `client-actions`, `campaign-actions`, `coverage-actions` that have create paths

- [ ] **Step 1: Add slug to each create action**

Pattern:

```ts
import { slugify, ensureUniqueSlug } from "@/lib/slug/slugify";

// inside createContact, before db.contact.create:
const organizationId = org.id;
const baseSlug = slugify(name);
const slug = await ensureUniqueSlug(baseSlug, async (candidate) => {
  const existing = await db.contact.findFirst({
    where: { organizationId, slug: candidate },
    select: { id: true },
  });
  return existing !== null;
});

await db.contact.create({
  data: {
    // ...existing fields
    slug,
  },
});
```

Apply the same shape to every create action for the five entities.

- [ ] **Step 2: Update import action**

In `src/actions/import-actions.ts::importContacts`, generate slugs for new rows only (not the update-dedup path). Reserve slugs in-memory across the batch so two rows with the same name in one import get different slugs (`alex-smith`, `alex-smith-2`). Simplest: after generating each slug, add it to a `Set` and include in the `exists` check.

- [ ] **Step 3: Manual verify**

Create a new contact in dev; check DB for a sensible `slug`. Run a CSV import with two rows named "John Smith"; confirm `john-smith` and `john-smith-2`.

- [ ] **Step 4: Commit**

```bash
git -c commit.gpgsign=false commit -am "feat(slug): generate slugs on entity create/import"
```

---

## Task 4: Dual-lookup in route handlers

**Files:**
- Modify: `src/app/(app)/contacts/[contactId]/page.tsx`
- Modify: `src/app/(app)/campaigns/[campaignId]/page.tsx`
- Modify: `src/app/(app)/suppliers/[supplierId]/page.tsx` (if exists)
- Modify: `src/app/(app)/workspaces/[clientId]/page.tsx` (if exists)
- Modify: `src/app/(app)/coverage/[coverageId]/page.tsx` (if exists)
- Modify: `src/app/(app)/events/[campaignId]/page.tsx`

- [ ] **Step 1: For each page, wrap the existing findUnique with a dual-lookup helper inline**

Pattern:

```ts
import { isCuid } from "@/lib/slug/resolve";

const { contactId: handle } = await params;
const contact = isCuid(handle)
  ? await db.contact.findUnique({ where: { id: handle }, include: { ... } })
  : await db.contact.findFirst({
      where: { organizationId: org.id, slug: handle },
      include: { ... },
    });

if (!contact) notFound();
```

Keep the include/relations exactly as they were. The change is only in the lookup.

For pages scoped to a client or campaign, scope by the relevant ID (clientId for campaigns, campaignId for coverage) — see design-decision notes.

- [ ] **Step 2: Generate metadata / breadcrumbs**

If any of these pages use `generateMetadata`, do the same dual-lookup there. Don't duplicate the logic — extract a local helper if used in both default export and metadata.

- [ ] **Step 3: Manual verify**

Visit `/contacts/<cuid>` (from browser history) → works. Visit `/contacts/<slug>` → also works.

- [ ] **Step 4: Commit**

```bash
git -c commit.gpgsign=false commit -am "feat(slug): dual-lookup by cuid or slug in entity routes"
```

---

## Task 5: Build URLs from slug across the app

**Files:**
- Search: `src/**/*.tsx` and `src/**/*.ts` for `href={\`/contacts/${...}\`}`, `href={\`/campaigns/${...}\`}`, etc. and `router.push("/contacts/"...)`.
- Update each to use `.slug` instead of `.id`.

- [ ] **Step 1: Find and replace**

Use grep to enumerate:

```bash
# Terminal:
grep -rn "/contacts/\${" src/
grep -rn "/campaigns/\${" src/
grep -rn "/suppliers/\${" src/
grep -rn "/workspaces/\${" src/
grep -rn "/coverage/\${" src/
grep -rn "/events/\${" src/
```

Replace `${contact.id}` → `${contact.slug}` etc. Check that the relevant query includes `slug` in its Prisma `select` / `include` — if any list query only selects `id`, extend it to select `slug` too.

- [ ] **Step 2: Manual verify**

Click through each list page → detail page pair. Confirm URLs read as slugs. Confirm back-button and breadcrumb URLs work.

- [ ] **Step 3: Type-check and build**

```bash
npm run build
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git -c commit.gpgsign=false commit -am "feat(slug): emit slug-based URLs across links and redirects"
```

---

## Task 6: Smoke

- [ ] Run `npm test` — expected: all previous tests plus ~9 new slug-utility tests pass.
- [ ] Run `npm run build` — expected: passes.
- [ ] In dev, navigate: list → detail for each entity type; confirm slug in URL bar; confirm old cuid URL from history still works.

---

## Open questions / caveats

1. **`unaccent` extension on Neon**: verified by running `SELECT extname FROM pg_extension` — if not present, the migration must `CREATE EXTENSION unaccent;` as the first statement, or fall back to a diacritic-unaware regex. Decide during migration authoring.
2. **Campaign unique-scope**: per-org is chosen; requires denormalised `organizationId` on Campaign and Coverage. If that's judged too invasive, the fallback is `(clientId, slug)` for Campaign and `(campaignId, slug)` for Coverage — same resolver pattern still works, just with a different scope column.
3. **Rename UX**: slug stays stable. If a user renames a contact and wants a matching slug, they can't (yet). Acceptable for v1; add a "Regenerate slug" admin action later if requested.
