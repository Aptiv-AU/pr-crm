# Sprint 1 — Commercialisation Basics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six highest-leverage "table-stakes" gaps that block Pressroom from being demo-ready for paying customers: CSV contact import, tags + segments, email templates, Gmail send provider, suppression list (manual), native-style composition (user's signature + font).

**Deliberately excluded from Sprint 1** (with rationale):
- **Open/click tracking** — Apple MPP accounts for ~49% of opens and pre-fetches every pixel; Gmail proxy adds more noise. Pixel + link-rewrite also defeat the "native-looking email" wedge that Feature 7 is designed to create. Reply detection (already working) is the metric that actually matters for PR 1:1 outreach. Revisit per-campaign click tracking in Sprint 2+ if a specific "press kit push" use case needs it.
- **Visible unsubscribe footer and `List-Unsubscribe` header** — CAN-SPAM does not apply to 1:1 personal outreach; Gmail/Yahoo bulk-sender rules only trigger at 5,000+ msgs/day, far above PR agency volume. Adding either creates the exact "this is marketing" signal we're trying to avoid. Suppression list remains (manually populated when a journalist asks to be removed).

**Architecture:** Each feature is independently shippable and touches a separate slice of the codebase. Execute in order — later features assume earlier schema changes are in place (e.g. open/click tracking and unsubscribe both depend on outreach send path being template-aware). Tests are restricted to pure business logic (parsers, merge engines, filters); UI and CRUD actions are verified manually. All schema changes go through `prisma migrate dev`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6 + Neon Postgres, NextAuth 5, Tailwind v4, shadcn/ui, Vercel Blob, Resend (auth only), Microsoft Graph (Outlook send). New: Vitest (tests), PapaParse (CSV), `googleapis` (Gmail), `nanoid` (unsubscribe tokens).

---

## Reference: conventions in this codebase

- Server actions live in `src/actions/*.ts` with `"use server"` directive and return `{ success: true, ... }` or `{ error: string }`
- Queries live in `src/lib/queries/*.ts`, accept `orgId` first argument, return Prisma types
- Get `organizationId` via the helper pattern used in `src/actions/contact-actions.ts` (finds first org — we keep this for now; multi-tenancy is out of scope for Sprint 1)
- UI uses shadcn/ui; server components are the default. Client components (`"use client"`) use `useTransition` for action calls.
- Always call `revalidatePath("/contacts")` etc. after mutations.
- Migrations: `npx prisma migrate dev --name <snake_case>`; never `db push`.

---

## Task 0: Set up Vitest for business-logic tests

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Create: `tsconfig.test.json`

- [ ] **Step 1: Install vitest and supporting deps**

```bash
npm install -D vitest @vitest/ui
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add scripts to `package.json`**

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test to confirm setup**

Create `src/lib/__smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
});
```

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: 1 passed, 1 total.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/lib/__smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for business-logic tests"
```

---

# Feature 1: CSV Contact Import

**Goal:** User can upload a CSV, map source columns to Contact fields (field-first: the UI lists target fields and lets the user pick which source column maps to each), preview rows, and bulk-create Contacts with dedup on email.

## Task 1.1: CSV parser module (pure, tested)

**Files:**
- Create: `src/lib/import/csv-parser.ts`
- Create: `src/lib/import/csv-parser.test.ts`

- [ ] **Step 1: Install PapaParse**

```bash
npm install papaparse && npm install -D @types/papaparse
```

- [ ] **Step 2: Write failing test**

`src/lib/import/csv-parser.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseCsvHeader, parseCsvRows } from "./csv-parser";

describe("parseCsvHeader", () => {
  it("extracts trimmed column names from first line", () => {
    const csv = "Name, Email ,Outlet\nJane,jane@ex.com,Vogue";
    expect(parseCsvHeader(csv)).toEqual(["Name", "Email", "Outlet"]);
  });
  it("returns empty array for empty input", () => {
    expect(parseCsvHeader("")).toEqual([]);
  });
});

describe("parseCsvRows", () => {
  it("returns rows keyed by header, trimming whitespace", () => {
    const csv = "Name,Email\nJane , jane@ex.com\nBob,bob@ex.com";
    const rows = parseCsvRows(csv);
    expect(rows).toEqual([
      { Name: "Jane", Email: "jane@ex.com" },
      { Name: "Bob", Email: "bob@ex.com" },
    ]);
  });
  it("skips fully empty rows", () => {
    const csv = "A,B\n1,2\n\n3,4";
    expect(parseCsvRows(csv)).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test
```

Expected: failures — `parseCsvHeader` and `parseCsvRows` not defined.

- [ ] **Step 4: Implement**

`src/lib/import/csv-parser.ts`:

```ts
import Papa from "papaparse";

export function parseCsvHeader(csv: string): string[] {
  if (!csv.trim()) return [];
  const firstLine = csv.split(/\r?\n/)[0];
  const parsed = Papa.parse<string[]>(firstLine, { skipEmptyLines: true });
  return (parsed.data[0] ?? []).map((s) => s.trim());
}

export function parseCsvRows(csv: string): Record<string, string>[] {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) out[k.trim()] = (v ?? "").trim();
    return out;
  });
}
```

- [ ] **Step 5: Run test to verify pass**

```bash
npm test
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add src/lib/import/ package.json package-lock.json
git commit -m "feat(import): csv parser with header + row extraction"
```

## Task 1.2: Contact import mapping + normalize

**Files:**
- Create: `src/lib/import/contact-import.ts`
- Create: `src/lib/import/contact-import.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { mapRowsToContacts, CONTACT_IMPORT_FIELDS } from "./contact-import";

describe("CONTACT_IMPORT_FIELDS", () => {
  it("declares target fields with labels and required flag", () => {
    const nameField = CONTACT_IMPORT_FIELDS.find((f) => f.key === "name");
    expect(nameField).toBeDefined();
    expect(nameField?.required).toBe(true);
  });
});

describe("mapRowsToContacts", () => {
  const rows = [
    { FullName: "Jane Doe", Mail: "jane@ex.com", Pub: "Vogue" },
    { FullName: "", Mail: "bob@ex.com", Pub: "GQ" },
    { FullName: "Amy", Mail: "", Pub: "" },
  ];
  const mapping = { name: "FullName", email: "Mail", outlet: "Pub" };

  it("maps rows through field mapping", () => {
    const { valid } = mapRowsToContacts(rows, mapping);
    expect(valid[0]).toMatchObject({ name: "Jane Doe", email: "jane@ex.com", outlet: "Vogue" });
  });

  it("rejects rows missing required fields", () => {
    const { valid, skipped } = mapRowsToContacts(rows, mapping);
    expect(valid).toHaveLength(2); // Jane and Amy (name present)
    expect(skipped).toHaveLength(1); // Bob (no name)
    expect(skipped[0].reason).toMatch(/name/i);
  });

  it("normalises emails to lowercase", () => {
    const { valid } = mapRowsToContacts(
      [{ N: "X", E: "MiXeD@ExAmPlE.com" }],
      { name: "N", email: "E" }
    );
    expect(valid[0].email).toBe("mixed@example.com");
  });
});
```

- [ ] **Step 2: Run test, see it fail**

- [ ] **Step 3: Implement**

```ts
export type ContactImportFieldKey =
  | "name" | "email" | "phone" | "outlet" | "beat" | "tier"
  | "instagram" | "twitter" | "linkedin" | "notes";

export const CONTACT_IMPORT_FIELDS: {
  key: ContactImportFieldKey;
  label: string;
  required: boolean;
  hint?: string;
}[] = [
  { key: "name", label: "Full name", required: true },
  { key: "email", label: "Email", required: false, hint: "Lowercased on import" },
  { key: "phone", label: "Phone", required: false },
  { key: "outlet", label: "Outlet / publication", required: false },
  { key: "beat", label: "Beat", required: false },
  { key: "tier", label: "Tier", required: false, hint: "e.g. A, B, C" },
  { key: "instagram", label: "Instagram", required: false },
  { key: "twitter", label: "Twitter / X", required: false },
  { key: "linkedin", label: "LinkedIn", required: false },
  { key: "notes", label: "Notes", required: false },
];

export type ContactImportMapping = Partial<Record<ContactImportFieldKey, string>>;

export type MappedContact = {
  name: string;
  email?: string;
  phone?: string;
  outlet?: string;
  beat?: string;
  tier?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  notes?: string;
};

export type SkippedRow = { rowIndex: number; reason: string; raw: Record<string, string> };

export function mapRowsToContacts(
  rows: Record<string, string>[],
  mapping: ContactImportMapping,
): { valid: MappedContact[]; skipped: SkippedRow[] } {
  const valid: MappedContact[] = [];
  const skipped: SkippedRow[] = [];

  rows.forEach((row, idx) => {
    const contact: Partial<MappedContact> = {};
    for (const field of CONTACT_IMPORT_FIELDS) {
      const sourceCol = mapping[field.key];
      if (!sourceCol) continue;
      const val = row[sourceCol]?.trim();
      if (!val) continue;
      contact[field.key] = field.key === "email" ? val.toLowerCase() : val;
    }

    if (!contact.name) {
      skipped.push({ rowIndex: idx, reason: "missing required field: name", raw: row });
      return;
    }
    valid.push(contact as MappedContact);
  });

  return { valid, skipped };
}
```

- [ ] **Step 4: Run tests, confirm pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/import/
git commit -m "feat(import): contact field mapping with required-field validation"
```

## Task 1.3: Bulk-create server action with dedup

**Files:**
- Create: `src/actions/import-actions.ts`

- [ ] **Step 1: Write the action**

```ts
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { MappedContact } from "@/lib/import/contact-import";

type ImportResult =
  | { success: true; created: number; updated: number; skipped: number }
  | { error: string };

export async function importContacts(contacts: MappedContact[]): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const org = await db.organization.findFirst();
  if (!org) return { error: "No organization" };

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const c of contacts) {
    try {
      if (c.email) {
        const existing = await db.contact.findFirst({
          where: { organizationId: org.id, email: c.email },
        });
        if (existing) {
          await db.contact.update({
            where: { id: existing.id },
            data: {
              name: c.name,
              phone: c.phone ?? existing.phone,
              outlet: c.outlet ?? existing.outlet,
              beat: c.beat ?? existing.beat,
              tier: c.tier ?? existing.tier,
              instagram: c.instagram ?? existing.instagram,
              twitter: c.twitter ?? existing.twitter,
              linkedin: c.linkedin ?? existing.linkedin,
              notes: c.notes ?? existing.notes,
            },
          });
          updated++;
          continue;
        }
      }

      const initials = c.name
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("");

      await db.contact.create({
        data: {
          organizationId: org.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          outlet: c.outlet,
          beat: c.beat,
          tier: c.tier,
          instagram: c.instagram,
          twitter: c.twitter,
          linkedin: c.linkedin,
          notes: c.notes,
          initials: initials || "?",
          avatarBg: "#1f2937",
          avatarFg: "#ffffff",
        },
      });
      created++;
    } catch (err) {
      skipped++;
      console.error("import row failed", err);
    }
  }

  revalidatePath("/contacts");
  return { success: true, created, updated, skipped };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/import-actions.ts
git commit -m "feat(import): server action for bulk contact import with email dedup"
```

## Task 1.4: Import modal UI

**Files:**
- Create: `src/components/contacts/import-contacts-modal.tsx`
- Modify: `src/app/(app)/contacts/page.tsx` (add "Import" button that opens modal)

- [ ] **Step 1: Create the modal component**

`src/components/contacts/import-contacts-modal.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { parseCsvHeader, parseCsvRows } from "@/lib/import/csv-parser";
import {
  CONTACT_IMPORT_FIELDS,
  mapRowsToContacts,
  type ContactImportMapping,
} from "@/lib/import/contact-import";
import { importContacts } from "@/actions/import-actions";
import { Dialog } from "@/components/ui/dialog"; // or your base-ui modal — align with existing pattern

type Step = "upload" | "map" | "preview" | "importing" | "done";

export function ImportContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>("upload");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ContactImportMapping>({});
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleFile(file: File) {
    const text = await file.text();
    setCsvText(text);
    const hs = parseCsvHeader(text);
    setHeaders(hs);
    setRows(parseCsvRows(text));
    const autoMapping: ContactImportMapping = {};
    for (const field of CONTACT_IMPORT_FIELDS) {
      const match = hs.find(
        (h) =>
          h.toLowerCase() === field.key.toLowerCase() ||
          h.toLowerCase().replace(/\s/g, "") === field.label.toLowerCase().replace(/\s/g, "")
      );
      if (match) autoMapping[field.key] = match;
    }
    setMapping(autoMapping);
    setStep("map");
  }

  function submitMapping() {
    const { valid, skipped } = mapRowsToContacts(rows, mapping);
    if (valid.length === 0) {
      setError(`No valid rows. ${skipped.length} skipped.`);
      return;
    }
    setError(null);
    setStep("preview");
  }

  function runImport() {
    const { valid } = mapRowsToContacts(rows, mapping);
    setStep("importing");
    startTransition(async () => {
      const res = await importContacts(valid);
      if ("error" in res) {
        setError(res.error);
        setStep("map");
      } else {
        setResult({ created: res.created, updated: res.updated, skipped: res.skipped });
        setStep("done");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <div className="p-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Import contacts</h2>

        {step === "upload" && (
          <label className="block border-2 border-dashed rounded p-8 text-center cursor-pointer">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <span>Drop CSV or click to choose</span>
          </label>
        )}

        {step === "map" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pick which CSV column feeds each Pressroom field. Fields marked * are required.
            </p>
            {CONTACT_IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="grid grid-cols-[1fr_1fr] gap-3 items-center">
                <span className="text-sm">
                  {field.label}{field.required && <span className="text-red-500"> *</span>}
                </span>
                <select
                  className="border rounded px-2 py-1"
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field.key]: e.target.value || undefined })
                  }
                >
                  <option value="">— none —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setStep("upload")}>Back</button>
              <button onClick={submitMapping} className="bg-primary text-white px-4 py-2 rounded">
                Preview
              </button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <PreviewStep
            rows={rows}
            mapping={mapping}
            onBack={() => setStep("map")}
            onConfirm={runImport}
          />
        )}

        {step === "importing" && <p>Importing {rows.length} rows…</p>}

        {step === "done" && result && (
          <div className="space-y-3">
            <p>Import complete.</p>
            <ul className="text-sm">
              <li>Created: {result.created}</li>
              <li>Updated (dedup by email): {result.updated}</li>
              <li>Skipped: {result.skipped}</li>
            </ul>
            <button onClick={onClose} className="bg-primary text-white px-4 py-2 rounded">
              Close
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function PreviewStep({
  rows, mapping, onBack, onConfirm,
}: {
  rows: Record<string, string>[];
  mapping: ContactImportMapping;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { valid, skipped } = mapRowsToContacts(rows, mapping);
  const preview = valid.slice(0, 5);
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Ready to import <strong>{valid.length}</strong> contacts.
        {skipped.length > 0 && <> Skipping {skipped.length}.</>}
      </p>
      <table className="text-sm w-full border">
        <thead>
          <tr className="bg-muted">
            <th className="p-1 text-left">Name</th>
            <th className="p-1 text-left">Email</th>
            <th className="p-1 text-left">Outlet</th>
          </tr>
        </thead>
        <tbody>
          {preview.map((r, i) => (
            <tr key={i}>
              <td className="p-1">{r.name}</td>
              <td className="p-1">{r.email ?? "—"}</td>
              <td className="p-1">{r.outlet ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onBack}>Back</button>
        <button onClick={onConfirm} className="bg-primary text-white px-4 py-2 rounded">
          Import
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire an "Import" button into contacts page**

In `src/app/(app)/contacts/page.tsx`, add a client-rendered "Import" button that opens the modal. If the page is a server component, extract the button + modal into a small client component `import-contacts-button.tsx`.

- [ ] **Step 3: Manual verify**

```bash
npm run dev
```

Navigate to `/contacts`, click Import, upload a sample CSV like:

```csv
name,email,outlet,beat
Jane Doe,jane@vogue.com,Vogue,Fashion
Bob Smith,bob@gq.com,GQ,Menswear
```

Expected: mapping auto-fills; preview shows 2 rows; import succeeds; contacts appear in list. Re-import same CSV → 2 updated, 0 created.

- [ ] **Step 4: Commit**

```bash
git add src/components/contacts/import-contacts-modal.tsx src/app/(app)/contacts/
git commit -m "feat(import): csv import modal with field-first mapping and preview"
```

---

# Feature 2: Tags + Saved Segments

**Goal:** Users can tag contacts (many-to-many) and save named filter segments that combine tag-AND, outlet, beat, tier, and text search.

## Task 2.1: Schema — ContactTag, ContactTagAssignment, ContactSegment

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add models**

```prisma
model ContactTag {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  label          String
  colorBg        String   @default("#374151")
  colorFg        String   @default("#ffffff")
  createdAt      DateTime @default(now())
  assignments    ContactTagAssignment[]

  @@unique([organizationId, label])
}

model ContactTagAssignment {
  id        String   @id @default(cuid())
  contactId String
  contact   Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  tagId     String
  tag       ContactTag @relation(fields: [tagId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([contactId, tagId])
  @@index([tagId])
}

model ContactSegment {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  filter         Json     // { tagIds?: string[]; outlets?: string[]; beats?: string[]; tiers?: string[]; search?: string }
  createdAt      DateTime @default(now())

  @@unique([organizationId, name])
}
```

- [ ] **Step 2: Add back-relations on Contact and Organization**

On `Contact`: `tags ContactTagAssignment[]`
On `Organization`: `contactTags ContactTag[]` and `contactSegments ContactSegment[]`

- [ ] **Step 3: Migrate**

```bash
npx prisma migrate dev --name add_contact_tags_and_segments
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): contact tags, tag assignments, saved segments"
```

## Task 2.2: Tag server actions

**Files:**
- Create: `src/actions/tag-actions.ts`

- [ ] **Step 1: Implement**

```ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export async function createTag(label: string, colorBg?: string) {
  if (!label.trim()) return { error: "Label required" };
  const organizationId = await orgId();
  const tag = await db.contactTag.create({
    data: { organizationId, label: label.trim(), colorBg: colorBg ?? "#374151" },
  });
  revalidatePath("/contacts");
  return { success: true, tag };
}

export async function deleteTag(tagId: string) {
  await db.contactTag.delete({ where: { id: tagId } });
  revalidatePath("/contacts");
  return { success: true };
}

export async function assignTag(contactId: string, tagId: string) {
  await db.contactTagAssignment.upsert({
    where: { contactId_tagId: { contactId, tagId } },
    create: { contactId, tagId },
    update: {},
  });
  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function removeTag(contactId: string, tagId: string) {
  await db.contactTagAssignment.deleteMany({ where: { contactId, tagId } });
  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/tag-actions.ts
git commit -m "feat(tags): server actions for tag CRUD and assignment"
```

## Task 2.3: Segment filter engine (pure, tested)

**Files:**
- Create: `src/lib/segments/filter.ts`
- Create: `src/lib/segments/filter.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildSegmentWhere, type SegmentFilter } from "./filter";

describe("buildSegmentWhere", () => {
  it("returns base org clause with no filters", () => {
    const where = buildSegmentWhere("org1", {});
    expect(where).toMatchObject({ organizationId: "org1" });
  });
  it("adds tag AND filter (every tag must match)", () => {
    const filter: SegmentFilter = { tagIds: ["t1", "t2"] };
    const where = buildSegmentWhere("org1", filter);
    expect(where.AND).toHaveLength(2);
  });
  it("adds outlet IN clause", () => {
    const where = buildSegmentWhere("org1", { outlets: ["Vogue", "GQ"] });
    expect(where.outlet).toEqual({ in: ["Vogue", "GQ"] });
  });
  it("adds case-insensitive search on name, email, outlet", () => {
    const where = buildSegmentWhere("org1", { search: "jane" });
    expect(where.OR).toEqual(expect.arrayContaining([
      { name: { contains: "jane", mode: "insensitive" } },
    ]));
  });
});
```

- [ ] **Step 2: Implement**

```ts
import type { Prisma } from "@prisma/client";

export type SegmentFilter = {
  tagIds?: string[];
  outlets?: string[];
  beats?: string[];
  tiers?: string[];
  search?: string;
};

export function buildSegmentWhere(organizationId: string, filter: SegmentFilter): Prisma.ContactWhereInput {
  const where: Prisma.ContactWhereInput = { organizationId };
  if (filter.outlets?.length) where.outlet = { in: filter.outlets };
  if (filter.beats?.length) where.beat = { in: filter.beats };
  if (filter.tiers?.length) where.tier = { in: filter.tiers };
  if (filter.search?.trim()) {
    const q = filter.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { outlet: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter.tagIds?.length) {
    where.AND = filter.tagIds.map((tagId) => ({
      tags: { some: { tagId } },
    }));
  }
  return where;
}
```

- [ ] **Step 3: Run tests, confirm pass**

- [ ] **Step 4: Commit**

```bash
git add src/lib/segments/
git commit -m "feat(segments): pure filter-to-prisma-where engine with tests"
```

## Task 2.4: Segment actions + contacts query using filter

**Files:**
- Create: `src/actions/segment-actions.ts`
- Modify: `src/lib/queries/contact-queries.ts` — add `getContactsByFilter(orgId, filter)` using `buildSegmentWhere`

- [ ] **Step 1: Segment actions**

```ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { SegmentFilter } from "@/lib/segments/filter";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export async function createSegment(name: string, filter: SegmentFilter) {
  if (!name.trim()) return { error: "Name required" };
  const organizationId = await orgId();
  const seg = await db.contactSegment.create({
    data: { organizationId, name: name.trim(), filter: filter as object },
  });
  revalidatePath("/contacts");
  return { success: true, segment: seg };
}

export async function deleteSegment(id: string) {
  await db.contactSegment.delete({ where: { id } });
  revalidatePath("/contacts");
  return { success: true };
}
```

- [ ] **Step 2: Add `getContactsByFilter`**

In `src/lib/queries/contact-queries.ts`:

```ts
import { buildSegmentWhere, type SegmentFilter } from "@/lib/segments/filter";

export async function getContactsByFilter(orgId: string, filter: SegmentFilter) {
  return db.contact.findMany({
    where: buildSegmentWhere(orgId, filter),
    include: { tags: { include: { tag: true } } },
    orderBy: { name: "asc" },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/actions/segment-actions.ts src/lib/queries/contact-queries.ts
git commit -m "feat(segments): CRUD for segments + contacts query by filter"
```

## Task 2.5: Tag chip UI + filter bar on contacts list

**Files:**
- Create: `src/components/contacts/tag-chip.tsx` — display pill with color
- Create: `src/components/contacts/tag-picker.tsx` — combobox on contact detail to add/remove tags
- Modify: `src/app/(app)/contacts/page.tsx` — add filter bar with tag multi-select + outlet/beat/tier + search; "Save as segment" button
- Modify: `src/components/contacts/contact-detail-client.tsx` — render assigned tags in the sidebar with the picker

- [ ] **Step 1: Build `TagChip` and `TagPicker`**

`tag-chip.tsx`:

```tsx
export function TagChip({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}
```

`tag-picker.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { assignTag, removeTag, createTag } from "@/actions/tag-actions";
import { TagChip } from "./tag-chip";

export function TagPicker({
  contactId,
  assigned,
  available,
}: {
  contactId: string;
  assigned: { id: string; label: string; colorBg: string; colorFg: string }[];
  available: { id: string; label: string; colorBg: string; colorFg: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState("");

  function toggle(tagId: string, isAssigned: boolean) {
    startTransition(async () => {
      if (isAssigned) await removeTag(contactId, tagId);
      else await assignTag(contactId, tagId);
    });
  }

  function addNew() {
    if (!input.trim()) return;
    startTransition(async () => {
      const res = await createTag(input.trim());
      if ("tag" in res && res.tag) {
        await assignTag(contactId, res.tag.id);
      }
      setInput("");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {assigned.map((t) => (
          <button key={t.id} onClick={() => toggle(t.id, true)}>
            <TagChip label={`× ${t.label}`} bg={t.colorBg} fg={t.colorFg} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {available
          .filter((t) => !assigned.some((a) => a.id === t.id))
          .map((t) => (
            <button key={t.id} onClick={() => toggle(t.id, false)} className="opacity-60 hover:opacity-100">
              <TagChip label={`+ ${t.label}`} bg={t.colorBg} fg={t.colorFg} />
            </button>
          ))}
      </div>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="New tag…"
          className="border rounded px-2 py-1 text-sm"
        />
        <button onClick={addNew} disabled={isPending} className="text-sm border rounded px-2">
          Add
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Contacts list filter bar**

Extract the list into `src/components/contacts/contacts-list-client.tsx` that accepts all tags, outlets, beats, tiers, and current segments. Internal state: `filter: SegmentFilter`; on change, fetches `getContactsByFilter` via a server action wrapper. Include "Save as segment" → opens name prompt → calls `createSegment`.

- [ ] **Step 3: Manual verify**

Tag a contact; filter by that tag; save as segment; reload page, re-select segment.

- [ ] **Step 4: Commit**

```bash
git add src/components/contacts/ src/app/(app)/contacts/
git commit -m "feat(tags): tag picker on contact detail and segment filter bar on list"
```

---

# Feature 3: Email Templates with Merge Fields

**Goal:** Users save reusable email templates with merge fields like `{{contact.name}}`, `{{contact.outlet}}`, `{{client.name}}`. The pitch composer can load a template into subject + body with merge fields resolved for the target contact.

## Task 3.1: Schema — EmailTemplate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add model**

```prisma
model EmailTemplate {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  subject        String
  body           String   @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([organizationId, name])
}
```

Add back-relation on Organization: `emailTemplates EmailTemplate[]`.

- [ ] **Step 2: Migrate**

```bash
npx prisma migrate dev --name add_email_templates
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): email templates"
```

## Task 3.2: Merge-field renderer (pure, tested)

**Files:**
- Create: `src/lib/templates/render.ts`
- Create: `src/lib/templates/render.test.ts`

Supported tokens: `{{contact.name}}`, `{{contact.firstName}}`, `{{contact.outlet}}`, `{{contact.beat}}`, `{{client.name}}`, `{{campaign.name}}`, `{{sender.name}}`. Unknown tokens render as `[missing: token]` so writers notice.

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from "vitest";
import { renderTemplate, availableTokens } from "./render";

describe("renderTemplate", () => {
  const ctx = {
    contact: { name: "Jane Doe", outlet: "Vogue", beat: null },
    client: { name: "Acme" },
    campaign: { name: "SS26 Launch" },
    sender: { name: "Scott" },
  };

  it("replaces simple tokens", () => {
    expect(renderTemplate("Hi {{contact.name}} at {{contact.outlet}}", ctx))
      .toBe("Hi Jane Doe at Vogue");
  });
  it("derives firstName from name", () => {
    expect(renderTemplate("Hi {{contact.firstName}}", ctx)).toBe("Hi Jane");
  });
  it("flags unknown tokens as [missing: …]", () => {
    expect(renderTemplate("{{contact.unknown}}", ctx)).toBe("[missing: contact.unknown]");
  });
  it("shows [missing: …] for null fields", () => {
    expect(renderTemplate("{{contact.beat}}", ctx)).toBe("[missing: contact.beat]");
  });
  it("availableTokens lists known tokens", () => {
    expect(availableTokens()).toContain("contact.name");
    expect(availableTokens()).toContain("client.name");
  });
});
```

- [ ] **Step 2: Implement**

```ts
export type RenderContext = {
  contact: { name: string; outlet?: string | null; beat?: string | null };
  client?: { name: string } | null;
  campaign?: { name: string } | null;
  sender: { name: string };
};

const TOKENS = [
  "contact.name",
  "contact.firstName",
  "contact.outlet",
  "contact.beat",
  "client.name",
  "campaign.name",
  "sender.name",
] as const;

export function availableTokens() {
  return [...TOKENS];
}

export function renderTemplate(template: string, ctx: RenderContext): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, token) => {
    const v = resolve(token, ctx);
    return v ?? `[missing: ${token}]`;
  });
}

function resolve(token: string, ctx: RenderContext): string | null {
  switch (token) {
    case "contact.name": return ctx.contact.name;
    case "contact.firstName": return ctx.contact.name.split(/\s+/)[0] ?? null;
    case "contact.outlet": return ctx.contact.outlet ?? null;
    case "contact.beat": return ctx.contact.beat ?? null;
    case "client.name": return ctx.client?.name ?? null;
    case "campaign.name": return ctx.campaign?.name ?? null;
    case "sender.name": return ctx.sender.name;
    default: return null;
  }
}
```

- [ ] **Step 3: Tests pass, commit**

```bash
git add src/lib/templates/
git commit -m "feat(templates): merge-field renderer with missing-token flagging"
```

## Task 3.3: Template actions and settings page

**Files:**
- Create: `src/actions/template-actions.ts` — `createTemplate`, `updateTemplate`, `deleteTemplate`, `listTemplates`
- Create: `src/app/(app)/settings/templates/page.tsx` — list + create form
- Create: `src/components/settings/template-form.tsx` — name/subject/body with "insert merge field" dropdown backed by `availableTokens()`

- [ ] **Step 1: Server actions**

```ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export async function createTemplate(data: { name: string; subject: string; body: string }) {
  const organizationId = await orgId();
  await db.emailTemplate.create({ data: { organizationId, ...data } });
  revalidatePath("/settings/templates");
  return { success: true };
}

export async function updateTemplate(id: string, data: { name: string; subject: string; body: string }) {
  await db.emailTemplate.update({ where: { id }, data });
  revalidatePath("/settings/templates");
  return { success: true };
}

export async function deleteTemplate(id: string) {
  await db.emailTemplate.delete({ where: { id } });
  revalidatePath("/settings/templates");
  return { success: true };
}
```

- [ ] **Step 2: Settings page + form**

Mirror the pattern from other settings pages. Form has Name, Subject, Body textareas; a "+ insert field" dropdown appending `{{token}}` at the cursor.

- [ ] **Step 3: Commit**

```bash
git add src/actions/template-actions.ts src/app/(app)/settings/templates/ src/components/settings/
git commit -m "feat(templates): template CRUD settings page"
```

## Task 3.4: Wire templates into pitch composer

**Files:**
- Modify: `src/components/campaigns/phase-outreach.tsx` (and/or the `OutreachSendCard` referenced within it)

- [ ] **Step 1: Add "Load template" control**

In the draft editing UI, add a dropdown listing templates. On selection, fetch the template + current contact + campaign/client, render subject and body with `renderTemplate`, and replace the current values.

Expose a new server action `applyTemplateToOutreach(outreachId, templateId)` that:

```ts
"use server";
// pseudo:
// 1. load outreach (with contact, campaign.client)
// 2. load template
// 3. renderTemplate(subject + body)
// 4. update outreach.subject + body
// 5. revalidate path
```

- [ ] **Step 2: Manual verify**

Create a template with merge fields, open a draft outreach, load the template, verify the preview shows resolved fields.

- [ ] **Step 3: Commit**

```bash
git add src/components/campaigns/ src/actions/
git commit -m "feat(templates): load-template control in pitch composer"
```

---


# Feature 5: Gmail Send Provider

**Goal:** Users can connect a Gmail account and send outreach through it, mirroring the existing Microsoft Graph integration. `EmailAccount.provider` becomes `"microsoft" | "google"`; the send path dispatches based on provider.

## Task 5.1: Dependency + env

**Files:**
- Modify: `package.json`
- Modify: `.env.example` (or README)

- [ ] **Step 1: Install**

```bash
npm install googleapis
```

- [ ] **Step 2: Add env**

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Document redirect URI: `<APP_URL>/api/email/google/callback`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore(gmail): add googleapis dep and env"
```

## Task 5.2: Gmail integration module (mirror of microsoft-graph.ts)

**Files:**
- Create: `src/lib/email/gmail.ts`

- [ ] **Step 1: Implement**

Mirror the five exports from `microsoft-graph.ts`:

```ts
import { google, gmail_v1 } from "googleapis";
import { db } from "@/lib/db";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function oauthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}

export function getGoogleAuthUrl(redirectUri: string, state: string) {
  const client = oauthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh token
    scope: SCOPES,
    state,
  });
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const client = oauthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const userinfo = google.oauth2({ version: "v2", auth: client });
  const { data } = await userinfo.userinfo.get();
  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3500 * 1000),
    email: data.email!,
  };
}

export async function refreshGoogleToken(refreshToken: string) {
  const client = oauthClient("");
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return {
    accessToken: credentials.access_token!,
    expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3500 * 1000),
  };
}

export async function getValidGoogleToken(emailAccountId: string): Promise<string> {
  const acct = await db.emailAccount.findUnique({ where: { id: emailAccountId } });
  if (!acct) throw new Error("email account not found");
  if (acct.expiresAt.getTime() - Date.now() > 5 * 60 * 1000) return acct.accessToken;
  const refreshed = await refreshGoogleToken(acct.refreshToken);
  await db.emailAccount.update({
    where: { id: emailAccountId },
    data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
  });
  return refreshed.accessToken;
}

export async function sendGmail(
  accessToken: string,
  { to, subject, bodyHtml }: { to: string; subject: string; bodyHtml: string },
): Promise<{ messageId: string; threadId: string }> {
  const client = oauthClient("");
  client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: client });

  const raw = Buffer.from(
    [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${subject}`,
      "",
      bodyHtml,
    ].join("\r\n"),
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return { messageId: data.id!, threadId: data.threadId! };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email/gmail.ts
git commit -m "feat(gmail): auth + send wrapper mirroring microsoft-graph"
```

## Task 5.3: Gmail OAuth routes

**Files:**
- Create: `src/app/api/email/google/connect/route.ts`
- Create: `src/app/api/email/google/callback/route.ts`

- [ ] **Step 1: Implement the connect + callback**

Pattern-match the existing Microsoft routes. `/connect` generates state, stashes in HttpOnly cookie, redirects to `getGoogleAuthUrl(...)`. `/callback` validates state, calls `exchangeGoogleCode`, upserts an `EmailAccount` with `provider: "google"`.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/email/google/
git commit -m "feat(gmail): oauth connect + callback routes"
```

## Task 5.4: Provider dispatch in send path

**Files:**
- Modify: `src/actions/outreach-actions.ts` — dispatch on `emailAccount.provider`

- [ ] **Step 1: Refactor send**

Replace the direct `sendMail(accessToken, ...)` call with:

```ts
import { sendMail as sendViaMicrosoft } from "@/lib/email/microsoft-graph";
import { sendGmail, getValidGoogleToken } from "@/lib/email/gmail";
import { getValidToken as getValidMicrosoftToken } from "@/lib/email/microsoft-graph";

let sendResult: { messageId: string; conversationId?: string; threadId?: string };
if (emailAccount.provider === "google") {
  const token = await getValidGoogleToken(emailAccount.id);
  const res = await sendGmail(token, { to: contact.email, subject: outreach.subject, bodyHtml });
  sendResult = { messageId: res.messageId, threadId: res.threadId };
} else {
  const token = await getValidMicrosoftToken(emailAccount.id);
  const res = await sendViaMicrosoft(token, { to: contact.email, subject: outreach.subject, bodyHtml });
  sendResult = { messageId: res.messageId, conversationId: res.conversationId };
}
```

Store both `messageId` and the per-provider thread identifier (add a `threadId` column if the existing `conversationId` field is too specific — a pragmatic call is to reuse `conversationId` for Gmail `threadId` since the semantics match; note in a short schema comment).

- [ ] **Step 2: Settings UI — connect buttons**

In `src/app/(app)/settings/email/page.tsx` (create or extend the existing email settings route), show both "Connect Outlook" and "Connect Gmail" buttons that link to `/api/email/connect` and `/api/email/google/connect`.

- [ ] **Step 3: Manual verify**

Connect a Gmail account. Send an outreach. Verify in Gmail Sent.

- [ ] **Step 4: Commit**

```bash
git add src/actions/outreach-actions.ts src/app/(app)/settings/
git commit -m "feat(gmail): provider dispatch and settings UI"
```

## Task 5.5: Reply detection for Gmail

**Files:**
- Modify: `src/lib/email/follow-up.ts` — extend `checkForReplies` to branch on provider

- [ ] **Step 1: Add Gmail-side reply check**

For Gmail, use `gmail.users.threads.get(threadId)` to list messages; filter out messages where `from` matches the user's email address; treat remaining as replies. Match the existing shape of what `getConversationReplies` returns.

- [ ] **Step 2: Commit**

```bash
git add src/lib/email/
git commit -m "feat(gmail): reply detection in check-replies cron"
```

---

# Feature 6: Suppression List (manual)

**Goal:** Maintain a per-org list of email addresses that must never be sent to. The send path blocks outgoing messages to suppressed addresses. Entries are created manually — either from a reply view ("Add to suppression list" button when a journalist asks to be removed) or from the suppression settings page. No visible unsubscribe footer and no `List-Unsubscribe` header are added to outgoing messages: pitches are 1:1 and addition of either undermines the native-feel wedge.

## Task 6.1: Schema — Suppression

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add model**

```prisma
model Suppression {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  email          String
  reason         SuppressionReason
  note           String?
  createdByUserId String?
  createdAt      DateTime @default(now())

  @@unique([organizationId, email])
}

enum SuppressionReason {
  reply_request   // journalist asked to be removed
  bounce          // future — populated by bounce handler
  manual          // added directly from settings
}
```

Add back-relation on Organization: `suppressions Suppression[]`.

- [ ] **Step 2: Migrate**

```bash
npx prisma migrate dev --name add_suppressions
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): suppression list"
```

## Task 6.2: Suppression actions

**Files:**
- Create: `src/actions/suppression-actions.ts`

- [ ] **Step 1: Implement**

```ts
"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function orgId() {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("no org");
  return org.id;
}

export async function addSuppression({
  email,
  reason,
  note,
}: {
  email: string;
  reason: "reply_request" | "manual";
  note?: string;
}) {
  const session = await auth();
  const organizationId = await orgId();
  const normalised = email.trim().toLowerCase();
  if (!normalised) return { error: "Email required" };

  await db.suppression.upsert({
    where: { organizationId_email: { organizationId, email: normalised } },
    create: {
      organizationId,
      email: normalised,
      reason,
      note,
      createdByUserId: session?.user?.id ?? null,
    },
    update: { reason, note },
  });
  revalidatePath("/settings/suppressions");
  return { success: true };
}

export async function removeSuppression(id: string) {
  await db.suppression.delete({ where: { id } });
  revalidatePath("/settings/suppressions");
  return { success: true };
}

export async function listSuppressions() {
  const organizationId = await orgId();
  return db.suppression.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/suppression-actions.ts
git commit -m "feat(suppression): server actions for add/remove/list"
```

## Task 6.3: Pre-send check

**Files:**
- Modify: `src/actions/outreach-actions.ts` — inside `sendOutreach`, before the actual provider dispatch

- [ ] **Step 1: Block suppressed sends**

```ts
// After loading outreach + contact + emailAccount, BEFORE sending:
const normalised = contact.email!.trim().toLowerCase();
const suppressed = await db.suppression.findFirst({
  where: { organizationId: org.id, email: normalised },
});
if (suppressed) {
  return { error: `Address is on the suppression list (${suppressed.reason})` };
}
```

- [ ] **Step 2: Manual verify**

Add a suppression manually; attempt to send to that address; expect the error.

- [ ] **Step 3: Commit**

```bash
git add src/actions/outreach-actions.ts
git commit -m "feat(suppression): block sends to suppressed addresses"
```

## Task 6.4: "Add to suppression list" action from reply view

**Files:**
- Modify: the outreach/reply UI (in `src/components/campaigns/phase-outreach.tsx` or wherever replies are rendered)

- [ ] **Step 1: Surface the action**

When an outreach has `status = "replied"`, add a small "Add to suppression list" button next to the reply. Clicking it calls `addSuppression({ email: contact.email, reason: "reply_request", note: `From reply on ${outreach.sentAt}` })`. Disable the button if the address is already suppressed.

- [ ] **Step 2: Commit**

```bash
git add src/components/campaigns/
git commit -m "feat(suppression): one-click add from reply view"
```

## Task 6.5: Suppression settings page

**Files:**
- Create: `src/app/(app)/settings/suppressions/page.tsx`

- [ ] **Step 1: Render list + add form**

Server component that lists all suppressions with columns: email, reason, note, added by, added at, [remove]. A small form at the top ("Add email to suppression list") with email + optional note → calls `addSuppression({ email, reason: "manual", note })`.

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/settings/suppressions/
git commit -m "feat(suppression): settings page"
```

---

# Feature 7: Native-Style Composition (Signature + Font)

**Goal:** Outreach emails look like the user wrote them in their normal mail client — same signature, same default font — not like a marketing blast. Resolve signature + font per connected `EmailAccount`; inline at send time. Confirmed safe: neither Gmail `users.messages.send` (raw MIME) nor Microsoft Graph `sendMail` auto-append the user's signature, so we inline without risk of double-signatures ([Gmail docs](https://developers.google.com/gmail/api/guides/sending), [Graph docs](https://learn.microsoft.com/en-us/graph/outlook-things-to-know-about-send-mail)).

**Data source reality check**:
- Gmail: `users.settings.sendAs.list` returns signature HTML per alias. No font API — use `Arial, sans-serif` 13px default. ([REST ref](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.sendAs))
- Microsoft 365: **no Graph endpoint for signature** (confirmed 2026-04, no ETA). Roaming signatures live as hidden items not Graph-exposed. Must scrape from Sent Items. Default font: Aptos 11pt (was Calibri pre-2023). ([MS Q&A](https://learn.microsoft.com/en-us/answers/questions/1093518/user-email-signature-management-via-graph-api))

## Task 7.1: Schema — EmailAccount style fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add fields**

```prisma
model EmailAccount {
  // ... existing fields
  signatureHtml       String?  @db.Text
  signatureSource     SignatureSource?  // api | scraped | manual | default
  fontFamily          String?  // resolved css value e.g. "Arial, sans-serif"
  fontSize            String?  // resolved css value e.g. "13px"
  styleResolvedAt     DateTime?
}

enum SignatureSource {
  api
  scraped
  manual
  default
}
```

- [ ] **Step 2: Migrate**

```bash
npx prisma migrate dev --name add_email_account_style_fields
```

- [ ] **Step 3: Expand scopes**

Update Gmail OAuth scopes in Feature 5 (`src/lib/email/gmail.ts` — `SCOPES` array) to include:

```ts
"https://www.googleapis.com/auth/gmail.settings.basic"
```

- [ ] **Step 4: Commit**

```bash
git add prisma/ src/lib/email/
git commit -m "feat(compose): email-account signature + font fields"
```

## Task 7.2: Signature-block extractor (pure, tested)

Uses a talon-style algorithm: strip quoted replies, find the trailing signature block. ~80–90% accuracy on well-formed HTML signatures per [Mailgun's talon write-up](https://www.mailgun.com/blog/product/open-sourcing-our-email-signature-parsing-library/). Good enough for MVP; users can manually edit.

**Files:**
- Create: `src/lib/compose/extract-signature.ts`
- Create: `src/lib/compose/extract-signature.test.ts`

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from "vitest";
import { extractSignature, extractFontStyle, stripQuotedReply } from "./extract-signature";

describe("stripQuotedReply", () => {
  it("strips Gmail quote blocks", () => {
    const html = `<p>Hi Jane</p><div class="gmail_quote">quoted stuff</div>`;
    expect(stripQuotedReply(html)).toBe(`<p>Hi Jane</p>`);
  });
  it("strips Outlook append-on-send blocks", () => {
    const html = `<p>Hi</p><div id="appendonsend"></div><hr><p>quoted</p>`;
    expect(stripQuotedReply(html)).toBe(`<p>Hi</p>`);
  });
  it("strips plaintext -- signature separator", () => {
    const html = `Hi there\n-- \nScott\nPressroom`;
    expect(stripQuotedReply(html)).toBe("Hi there\n-- \nScott\nPressroom"); // separator kept; extractor uses it
  });
});

describe("extractFontStyle", () => {
  it("pulls font-family + size from outermost styled div", () => {
    const html = `<div style="font-family:Aptos,sans-serif;font-size:11pt"><p>Hi</p></div>`;
    const { fontFamily, fontSize } = extractFontStyle(html);
    expect(fontFamily).toContain("Aptos");
    expect(fontSize).toBe("11pt");
  });
  it("returns nulls on unstyled body", () => {
    const { fontFamily, fontSize } = extractFontStyle("<p>Hi</p>");
    expect(fontFamily).toBeNull();
    expect(fontSize).toBeNull();
  });
});

describe("extractSignature", () => {
  it("returns trailing block consistent across messages containing user's name", () => {
    const userName = "Scott White";
    const msgs = [
      `<p>Hi Jane</p><p>Pitch content</p><p>—<br>Scott White<br>Publicist<br>scott@pressroom.co</p>`,
      `<p>Hi Bob</p><p>Different pitch</p><p>—<br>Scott White<br>Publicist<br>scott@pressroom.co</p>`,
      `<p>Hey Amy</p><p>Another pitch</p><p>—<br>Scott White<br>Publicist<br>scott@pressroom.co</p>`,
    ];
    const sig = extractSignature(msgs, userName);
    expect(sig).toContain("Scott White");
    expect(sig).toContain("Publicist");
  });
  it("returns null if no stable signature found", () => {
    const msgs = ["<p>Hi</p>", "<p>Hello</p>"];
    expect(extractSignature(msgs, "Scott White")).toBeNull();
  });
});
```

- [ ] **Step 2: Implement**

```ts
export function stripQuotedReply(html: string): string {
  return html
    .replace(/<div class="gmail_quote"[\s\S]*?<\/div>\s*$/i, "")
    .replace(/<div id="appendonsend"[\s\S]*$/i, "")
    .replace(/<hr[^>]*id="stopSpelling"[\s\S]*$/i, "")
    .trim();
}

export function extractFontStyle(html: string): { fontFamily: string | null; fontSize: string | null } {
  const m = html.match(/<div[^>]*style="([^"]*)"/i);
  if (!m) return { fontFamily: null, fontSize: null };
  const style = m[1];
  const famMatch = style.match(/font-family\s*:\s*([^;]+)/i);
  const sizeMatch = style.match(/font-size\s*:\s*([^;]+)/i);
  return {
    fontFamily: famMatch ? famMatch[1].trim() : null,
    fontSize: sizeMatch ? sizeMatch[1].trim() : null,
  };
}

export function extractSignature(messages: string[], userName: string): string | null {
  // For each message, take the last ~5 lines / last <p>/<div>/<table> block.
  const trailers = messages
    .map((html) => stripQuotedReply(html))
    .map((html) => {
      const blocks = html.match(/<(?:p|div|table)[^>]*>[\s\S]*?<\/(?:p|div|table)>/gi) ?? [];
      return blocks.slice(-2).join("");
    })
    .filter((t) => t.includes(userName.split(" ")[0]) || t.includes(userName));

  if (trailers.length < 2) return null;

  // Find the longest common trailing substring across trailers — crude but effective.
  const [first, ...rest] = trailers;
  let candidate = first;
  while (candidate.length > 30) {
    if (rest.every((t) => t.includes(candidate))) return candidate;
    candidate = candidate.slice(1); // shave from the left
  }
  return null;
}
```

- [ ] **Step 3: Tests pass, commit**

```bash
git add src/lib/compose/
git commit -m "feat(compose): signature extractor with quoted-reply stripping"
```

## Task 7.3: Style resolver per provider

**Files:**
- Create: `src/lib/compose/resolve-style.ts`

- [ ] **Step 1: Implement**

```ts
import { google } from "googleapis";
import { db } from "@/lib/db";
import { getValidGoogleToken } from "@/lib/email/gmail";
import { getValidToken as getValidMicrosoftToken } from "@/lib/email/microsoft-graph";
import { extractSignature, extractFontStyle } from "./extract-signature";

const GMAIL_DEFAULT_FONT = 'Arial, Helvetica, sans-serif';
const GMAIL_DEFAULT_SIZE = '13px';
const OUTLOOK_DEFAULT_FONT = 'Aptos, Calibri, sans-serif';
const OUTLOOK_DEFAULT_SIZE = '11pt';

export async function resolveStyle(emailAccountId: string) {
  const acct = await db.emailAccount.findUnique({ where: { id: emailAccountId } });
  if (!acct) throw new Error("EmailAccount not found");

  if (acct.provider === "google") {
    return await resolveGoogle(acct);
  }
  return await resolveMicrosoft(acct);
}

async function resolveGoogle(acct: { id: string; email: string }) {
  const token = await getValidGoogleToken(acct.id);
  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({ access_token: token });
  const gmail = google.gmail({ version: "v1", auth: authClient });

  // Signature via sendAs
  let signatureHtml: string | null = null;
  try {
    const { data } = await gmail.users.settings.sendAs.list({ userId: "me" });
    const chosen = data.sendAs?.find((s) => s.isDefault) ?? data.sendAs?.find((s) => s.isPrimary);
    if (chosen?.signature) signatureHtml = chosen.signature;
  } catch (e) {
    console.warn("sendAs.list failed, will fall back to sent-items scrape", e);
  }

  // Font: no API — scrape sent items
  let fontFamily: string | null = null;
  let fontSize: string | null = null;
  try {
    const { data: sentList } = await gmail.users.messages.list({
      userId: "me", q: "in:sent -in:chats newer_than:90d", maxResults: 10,
    });
    const msgs = await Promise.all(
      (sentList.messages ?? []).slice(0, 10).map((m) =>
        gmail.users.messages.get({ userId: "me", id: m.id!, format: "full" })
      ),
    );
    const htmls = msgs.map((r) => extractHtmlPart(r.data)).filter(Boolean) as string[];
    // If we didn't get signature from sendAs, try extracting
    if (!signatureHtml && htmls.length >= 2) {
      signatureHtml = extractSignature(htmls, acct.email.split("@")[0]);
    }
    const styles = htmls.map(extractFontStyle).filter((s) => s.fontFamily);
    if (styles[0]) {
      fontFamily = styles[0].fontFamily;
      fontSize = styles[0].fontSize;
    }
  } catch (e) {
    console.warn("sent-items scrape failed", e);
  }

  const source = signatureHtml ? (fontFamily ? "api" : "api") : "default";
  await db.emailAccount.update({
    where: { id: acct.id },
    data: {
      signatureHtml,
      signatureSource: source as "api" | "default",
      fontFamily: fontFamily ?? GMAIL_DEFAULT_FONT,
      fontSize: fontSize ?? GMAIL_DEFAULT_SIZE,
      styleResolvedAt: new Date(),
    },
  });
}

async function resolveMicrosoft(acct: { id: string; email: string }) {
  const token = await getValidMicrosoftToken(acct.id);
  // Fetch recent Sent Items; Graph has no signature endpoint
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/mailFolders/SentItems/messages?$top=10&$select=body,subject,sentDateTime",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  const htmls: string[] = (data.value ?? []).map((m: any) => m.body?.content).filter(Boolean);

  const firstName = acct.email.split("@")[0];
  const signatureHtml = htmls.length >= 2 ? extractSignature(htmls, firstName) : null;
  const style = htmls.map(extractFontStyle).find((s) => s.fontFamily) ?? { fontFamily: null, fontSize: null };

  await db.emailAccount.update({
    where: { id: acct.id },
    data: {
      signatureHtml,
      signatureSource: signatureHtml ? "scraped" : "default",
      fontFamily: style.fontFamily ?? OUTLOOK_DEFAULT_FONT,
      fontSize: style.fontSize ?? OUTLOOK_DEFAULT_SIZE,
      styleResolvedAt: new Date(),
    },
  });
}

function extractHtmlPart(message: any): string | null {
  const parts = [message.payload, ...(message.payload?.parts ?? [])];
  for (const p of parts) {
    if (p?.mimeType === "text/html" && p.body?.data) {
      return Buffer.from(p.body.data, "base64url").toString("utf-8");
    }
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/compose/resolve-style.ts
git commit -m "feat(compose): style resolver — sendAs for Gmail, scrape for Graph"
```

## Task 7.4: Resolve-on-connect + manual refresh + manual override

**Files:**
- Modify: `src/app/api/email/callback/route.ts` and `src/app/api/email/google/callback/route.ts`
- Create: `src/actions/email-style-actions.ts` — `refreshEmailStyle(accountId)`, `setManualSignature(accountId, html, fontFamily, fontSize)`
- Modify: `src/app/(app)/settings/email/page.tsx` — show current signature preview, "Refresh from mailbox" button, "Edit manually" textarea

- [ ] **Step 1: Trigger resolver on OAuth callback**

In both callback handlers, after the `EmailAccount` is upserted, enqueue/await `resolveStyle(account.id)` (wrap in try/catch so failure doesn't break connection).

- [ ] **Step 2: Settings UI**

```
[Preview: rendered signature HTML]
[Detected font: Arial 13px]
[Source: Gmail API | Scraped from sent items | Manual]

[Refresh from mailbox]  [Edit manually]
```

Edit-manually opens a rich-text or HTML textarea + separate font-family/size inputs → calls `setManualSignature` which flips `signatureSource = "manual"`.

- [ ] **Step 3: Commit**

```bash
git add src/actions/email-style-actions.ts src/app/(app)/settings/ src/app/api/email/
git commit -m "feat(compose): resolve style on connect + manual override UI"
```

## Task 7.5: Inject signature + font at send time

**Files:**
- Modify: `src/actions/outreach-actions.ts`

- [ ] **Step 1: Wrap body + append signature**

Final send-path composition order (post-Sprint 1):

1. Render merge fields from template (Feature 3)
2. Convert plaintext → HTML paragraphs (existing behaviour)
3. Wrap body in user's font div
4. Append user's signature HTML
5. (Suppression check already blocked the send earlier; no footer, no pixel, no link-rewrite)

```ts
const fontFamily = emailAccount.fontFamily ?? "Arial, sans-serif";
const fontSize = emailAccount.fontSize ?? "13px";
const signature = emailAccount.signatureHtml ?? "";

bodyHtml = `<div style="font-family:${fontFamily};font-size:${fontSize};color:#1f2937">${bodyHtml}</div>`;
if (signature) {
  bodyHtml += `<div style="font-family:${fontFamily};font-size:${fontSize};color:#1f2937">${signature}</div>`;
}
```

- [ ] **Step 2: Manual verify**

Connect a Gmail account with a real signature. Draft an outreach. Send to yourself → confirm received email shows the signature in the user's normal font. The email should visually resemble a plain one-to-one email, not a marketing template. Compare to a blank send from the Gmail web UI — should be visually indistinguishable.

- [ ] **Step 3: Commit**

```bash
git add src/actions/outreach-actions.ts
git commit -m "feat(compose): wrap outreach in user's font and append signature"
```

---

# Sprint 1 Wrap-up

## Task W.1: Smoke run

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: all green.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: succeeds, no type errors.

- [ ] **Step 3: End-to-end manual check on dev server**

1. Import a CSV of 10 contacts
2. Tag 3 of them "A-list"
3. Save segment "A-list journalists"
4. Create an email template with merge fields
5. Open a campaign → compose an outreach → load the template → verify merge fields render
6. Verify resolved signature preview in Settings → Email; refresh; override manually
7. Send via Gmail → verify Sent folder shows message visually indistinguishable from a normal Gmail-composed message (native font, native signature, no tracking artefacts, no unsubscribe footer)
8. From a reply view, click "Add to suppression list"
9. Try to send another outreach to the same contact → expect "Address is on the suppression list" error
10. Manually add a different address in Settings → Suppressions; retry; remove; retry succeeds

## Task W.2: Update project memory

- [ ] Record key findings from implementation in memory files — especially any pattern divergences or surprises, so future sessions build on them.

## Task W.3: PR

Open a PR titled "Sprint 1 — Commercialisation Basics" covering all commits. Body should reference this plan.

---

## Open items deferred to a later sprint

- Scheduling cron for `scheduledAt` on outreach (Sprint 2 item)
- Reply body parsing (Sprint 2)
- Dashboard v2 with filters (Sprint 2)
- Stripe billing (Sprint 2)
- Contact dedup on import is handled; richer fuzzy-match dedup (same person across name variants) is Sprint 2

## Self-review notes

- All tasks have exact file paths, full code for non-obvious logic, and manual-verify steps for UI.
- Tests are restricted to pure business logic: CSV parsing, field mapping, filter builder, template renderer, signature extractor. UI and CRUD actions are verified manually, consistent with the codebase's current zero-test baseline.
- Open/click tracking and visible unsubscribe mechanisms were deliberately excluded from Sprint 1 (rationale in the plan header). Infrastructure for adding opt-in click tracking later (per-campaign toggle, classification) can reuse the `OutreachEvent` schema — defer until a specific use case justifies the complexity.
- Feature 5 reuses `EmailAccount.conversationId` for Gmail `threadId`; if a later sprint needs provider-specific semantics, rename to `threadId` with a migration.
- Feature 7 inlines the user's signature. Scope for double-signatures: confirmed zero for Graph `sendMail` and Gmail raw MIME `users.messages.send`. If users also configure a client-side signature on the web UI and then manually edit a draft inside Gmail/Outlook web before sending via Pressroom (unlikely workflow), they could get double signatures — acceptable edge case.
