# Phase 2: Contacts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Contacts screens — list with table/card views, beat filter, contact detail with tabs, and add/edit contact slide-over — wired to Postgres so the user can build their media contact list.

**Architecture:** Server Components for pages, Client Components for interactive elements (filters, tabs, forms). Contacts are org-scoped. The list page shows a table on desktop and cards on mobile. Contact detail has a hero + stats + tabbed content area with sidebar info cards.

**Tech Stack:** Next.js App Router, Prisma, Server Actions, React Server Components

**Design Spec:** `docs/superpowers/specs/2026-04-12-pressroom-crm-design.md`
**Mockup Reference:** `pressroom_v7.jsx` (repo root at `/Users/scott/Developer/pr-crm/`)

---

## CSS Variable Reference

- `var(--page-bg)`, `var(--card-bg)`, `var(--sidebar-bg)`
- `var(--border-custom)`, `var(--border-mid)`
- `var(--text-primary)`, `var(--text-sub)`, `var(--text-muted-custom)`
- `var(--accent-custom)`, `var(--accent-bg)`, `var(--accent-border)`, `var(--accent-text)`
- `var(--hover-bg)`, `var(--active-bg)`
- `var(--green)`, `var(--green-bg)`, `var(--green-border)`
- `var(--amber)`, `var(--amber-bg)`, `var(--amber-border)`
- `var(--slate-custom)`, `var(--slate-bg)`, `var(--slate-border)`
- `var(--overlay)`

## Existing Components to Reuse

- `StatsBar` from `src/components/workspaces/stats-bar.tsx` — move to `src/components/shared/`
- `SlideOverPanel` from `src/components/shared/slide-over-panel.tsx`
- `Avatar`, `Badge`, `Button`, `Card`, `Icon`, `Divider` from `src/components/ui/`

## File Structure

```
src/
├── actions/
│   └── contact-actions.ts              # Server Actions: createContact, updateContact
├── lib/queries/
│   └── contact-queries.ts              # Prisma queries for contacts
├── components/
│   ├── shared/
│   │   ├── slide-over-panel.tsx         # (existing)
│   │   ├── stats-bar.tsx               # (move from workspaces/)
│   │   └── filter-pills.tsx            # Reusable pill filter (beat, category, etc.)
│   └── contacts/
│       ├── contact-table.tsx           # Desktop table view
│       ├── contact-card-list.tsx       # Mobile card list view
│       ├── contact-form.tsx            # Add/edit contact form
│       ├── contact-hero.tsx            # Contact detail hero section
│       ├── contact-info-sidebar.tsx    # Detail page sidebar cards
│       └── contact-tabs.tsx            # Detail page tab navigation + content
├── app/(app)/
│   ├── contacts/
│   │   ├── page.tsx                    # Contacts list (Server Component)
│   │   └── [contactId]/
│   │       └── page.tsx                # Contact detail (Server Component)
```

---

### Task 1: Move StatsBar to Shared + Create FilterPills

**Files:**
- Move: `src/components/workspaces/stats-bar.tsx` → `src/components/shared/stats-bar.tsx`
- Update imports in: `src/app/(app)/workspaces/page.tsx`
- Create: `src/components/shared/filter-pills.tsx`

- [ ] **Step 1: Move StatsBar to shared**

Move `src/components/workspaces/stats-bar.tsx` to `src/components/shared/stats-bar.tsx`. Update the import in `src/app/(app)/workspaces/page.tsx` from `@/components/workspaces/stats-bar` to `@/components/shared/stats-bar`.

- [ ] **Step 2: Create FilterPills component**

Create `src/components/shared/filter-pills.tsx` — a "use client" component for pill-style toggle filters. This will be reused for beat filters (Contacts), category filters (Suppliers), etc.

```typescript
"use client";

interface FilterPillsProps {
  options: string[];
  selected: string;
  onChange: (value: string) => void;
}

export function FilterPills({ options, selected, onChange }: FilterPillsProps) {
  return (
    <div
      className="flex gap-[5px] overflow-x-auto pb-1"
      style={{ WebkitOverflowScrolling: "touch" as unknown as string }}
    >
      {options.map((option) => {
        const isActive = selected === option;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className="shrink-0 cursor-pointer rounded-full px-[10px] py-[4px] text-[11px] font-medium transition-colors"
            style={{
              background: isActive ? "var(--text-primary)" : "transparent",
              color: isActive ? "var(--card-bg)" : "var(--text-sub)",
              border: `1px solid ${isActive ? "var(--text-primary)" : "var(--border-custom)"}`,
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/ src/components/workspaces/ src/app/\(app\)/workspaces/page.tsx
git commit -m "refactor: move StatsBar to shared, add FilterPills component"
```

---

### Task 2: Contact Queries

**Files:**
- Create: `src/lib/queries/contact-queries.ts`

- [ ] **Step 1: Create the queries file**

Create `src/lib/queries/contact-queries.ts`:

```typescript
import { db } from "@/lib/db";

export async function getContacts(organizationId: string, beat?: string) {
  return db.contact.findMany({
    where: {
      organizationId,
      ...(beat && beat !== "All" ? { beat } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContactById(contactId: string) {
  return db.contact.findUnique({
    where: { id: contactId },
    include: {
      campaignContacts: {
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              type: true,
              status: true,
              client: {
                select: { id: true, name: true, initials: true, colour: true, bgColour: true },
              },
            },
          },
        },
      },
      outreaches: {
        select: { id: true, subject: true, status: true, createdAt: true, campaignId: true },
        orderBy: { createdAt: "desc" },
      },
      coverages: {
        select: { id: true, publication: true, date: true, type: true, mediaValue: true },
        orderBy: { date: "desc" },
      },
      interactions: {
        select: { id: true, type: true, date: true, summary: true },
        orderBy: { date: "desc" },
        take: 20,
      },
    },
  });
}

export async function getContactStats(organizationId: string) {
  const [total, aList, warm] = await Promise.all([
    db.contact.count({ where: { organizationId } }),
    db.contact.count({ where: { organizationId, tier: "A" } }),
    db.contact.count({ where: { organizationId, health: "warm" } }),
  ]);

  return { total, aList, warm };
}

export async function getContactDetailStats(contactId: string) {
  const [coverageCount, outreachStats, campaignCount] = await Promise.all([
    db.coverage.count({ where: { contactId } }),
    db.outreach.groupBy({
      by: ["status"],
      where: { contactId },
      _count: true,
    }),
    db.campaignContact.count({ where: { contactId } }),
  ]);

  const totalOutreach = outreachStats.reduce((sum, s) => sum + s._count, 0);
  const replied = outreachStats.find((s) => s.status === "replied")?._count ?? 0;
  const replyRate = totalOutreach > 0 ? Math.round((replied / totalOutreach) * 100) : 0;

  return { coverageCount, replyRate, campaignCount };
}

export async function getContactBeats(organizationId: string): Promise<string[]> {
  const beats = await db.contact.findMany({
    where: { organizationId },
    select: { beat: true },
    distinct: ["beat"],
    orderBy: { beat: "asc" },
  });
  return beats.map((b) => b.beat);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queries/contact-queries.ts
git commit -m "feat: add contact query functions"
```

---

### Task 3: Contact Server Actions

**Files:**
- Create: `src/actions/contact-actions.ts`

- [ ] **Step 1: Create server actions**

Create `src/actions/contact-actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getOrganizationId(): Promise<string> {
  const org = await db.organization.findFirst();
  if (!org) throw new Error("No organization found");
  return org.id;
}

export async function createContact(formData: FormData) {
  try {
    const orgId = await getOrganizationId();

    const name = formData.get("name") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const publication = formData.get("publication") as string | null;
    const beat = formData.get("beat") as string | null;
    const tier = formData.get("tier") as string | null;
    const initials = formData.get("initials") as string | null;
    const avatarBg = formData.get("avatarBg") as string | null;
    const avatarFg = formData.get("avatarFg") as string | null;
    const instagram = formData.get("instagram") as string | null;
    const twitter = formData.get("twitter") as string | null;
    const linkedin = formData.get("linkedin") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!name || !publication || !beat || !tier || !initials || !avatarBg || !avatarFg) {
      return { error: "Name, publication, beat, tier, and initials are required" };
    }

    const contact = await db.contact.create({
      data: {
        organizationId: orgId,
        name,
        email: email || null,
        phone: phone || null,
        publication,
        beat,
        tier,
        health: "warm",
        initials: initials.toUpperCase().slice(0, 2),
        avatarBg,
        avatarFg,
        instagram: instagram || null,
        twitter: twitter || null,
        linkedin: linkedin || null,
        notes: notes || null,
      },
    });

    revalidatePath("/contacts");
    return { success: true, contactId: contact.id };
  } catch (error) {
    console.error("createContact error:", error);
    return { error: error instanceof Error ? error.message : "Failed to create contact" };
  }
}

export async function updateContact(contactId: string, formData: FormData) {
  try {
    const name = formData.get("name") as string | null;
    const email = formData.get("email") as string | null;
    const phone = formData.get("phone") as string | null;
    const publication = formData.get("publication") as string | null;
    const beat = formData.get("beat") as string | null;
    const tier = formData.get("tier") as string | null;
    const health = formData.get("health") as string | null;
    const initials = formData.get("initials") as string | null;
    const avatarBg = formData.get("avatarBg") as string | null;
    const avatarFg = formData.get("avatarFg") as string | null;
    const instagram = formData.get("instagram") as string | null;
    const twitter = formData.get("twitter") as string | null;
    const linkedin = formData.get("linkedin") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!name || !publication || !beat || !tier || !initials || !avatarBg || !avatarFg) {
      return { error: "Name, publication, beat, tier, and initials are required" };
    }

    await db.contact.update({
      where: { id: contactId },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        publication,
        beat,
        tier,
        health: health || "warm",
        initials: initials.toUpperCase().slice(0, 2),
        avatarBg,
        avatarFg,
        instagram: instagram || null,
        twitter: twitter || null,
        linkedin: linkedin || null,
        notes: notes || null,
      },
    });

    revalidatePath("/contacts");
    revalidatePath(`/contacts/${contactId}`);
    return { success: true };
  } catch (error) {
    console.error("updateContact error:", error);
    return { error: error instanceof Error ? error.message : "Failed to update contact" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/contact-actions.ts
git commit -m "feat: add contact create/update server actions"
```

---

### Task 4: Contact Form Component

**Files:**
- Create: `src/components/contacts/contact-form.tsx`

- [ ] **Step 1: Create the contact form**

Create `src/components/contacts/contact-form.tsx` — "use client" component. Follow the same pattern as ClientForm but with contact-specific fields.

Props: `contact?: { id, name, email, phone, publication, beat, tier, health, initials, avatarBg, avatarFg, instagram, twitter, linkedin, notes } | null`, `onSuccess: () => void`

Fields:
- Name (text, required)
- Email (email, optional)
- Phone (text, optional)
- Publication (text, required — e.g., "Vogue Beauty")
- Beat (select: Beauty, Fashion, Lifestyle, Skincare, or custom text input)
- Tier (select: A, B, C)
- Initials (2-char, auto-generated from name)
- Color picker (same 8 presets as ClientForm — reuse the COLOR_PRESETS array)
- Instagram, Twitter, LinkedIn (text, optional)
- Notes (textarea, optional)

The colour presets set both `avatarBg` and `avatarFg` for the contact avatar.

Auto-generate initials from name (same logic as ClientForm).

Live preview: show the contact avatar (30px circle) with name and publication.

Use `useTransition` for pending state. Call `createContact` or `updateContact` from actions.

- [ ] **Step 2: Commit**

```bash
git add src/components/contacts/contact-form.tsx
git commit -m "feat: add ContactForm with all contact fields"
```

---

### Task 5: Contact Table (Desktop) and Card List (Mobile)

**Files:**
- Create: `src/components/contacts/contact-table.tsx`
- Create: `src/components/contacts/contact-card-list.tsx`

- [ ] **Step 1: Create desktop table view**

Create `src/components/contacts/contact-table.tsx` — "use client" component (needs hover handlers).

Props: `contacts: { id, name, initials, avatarBg, avatarFg, publication, beat, tier, health, createdAt }[]`

Renders a table matching the mockup:
- Header row: Name | Publication | Beat | Tier | Relationship | Last contact | (empty for chevron)
- Header text: 11px, uppercase, font-medium, text-muted-custom, letter-spacing 0.06em
- Body rows: clickable (Link to `/contacts/[id]`), hover bg hover-bg
- Name cell: Avatar (26px) + name text (13px, font-medium)
- Publication cell: 12px, text-sub
- Beat cell: Badge variant="default"
- Tier cell: Badge variant="solid" for A-list, "default" for B/C
- Health cell: Badge variant="warm" for warm, "cool" for cool
- Last contact: relative time from createdAt (e.g., "2d", "1w") — 12px, text-muted-custom
- Last cell: chevronR icon

Table styling: no external table library, use `<table>` with inline styles/classes. Border-bottom on rows using border-custom. Cell padding: 10px 12px.

- [ ] **Step 2: Create mobile card list view**

Create `src/components/contacts/contact-card-list.tsx` — "use client" component.

Props: same as contact-table.

Renders vertical card list:
- Each card: Link to `/contacts/[id]`, border border-custom, rounded-lg, p-3
- Layout: flex row — Avatar (36px) on left, content on right
- Content: name (13px, font-medium), publication (11px, text-sub)
- Below content: flex row of badges — tier Badge + health Badge
- ChevronR on far right

- [ ] **Step 3: Commit**

```bash
git add src/components/contacts/
git commit -m "feat: add contact table (desktop) and card list (mobile) views"
```

---

### Task 6: Contacts List Page (/contacts)

**Files:**
- Modify: `src/app/(app)/contacts/page.tsx`
- Create: `src/components/contacts/contacts-list-client.tsx` (client wrapper for filters + responsive view)

- [ ] **Step 1: Create client wrapper for interactive elements**

Create `src/components/contacts/contacts-list-client.tsx` — "use client" component that handles:
- Beat filter state
- Responsive detection (desktop vs mobile)
- Rendering ContactTable or ContactCardList based on viewport
- Add contact button + SlideOverPanel with ContactForm

Props: `contacts` array, `beats` string array, `stats` object

The component filters contacts client-side based on selected beat. For responsive detection, use a simple approach: render both views and use `hidden md:block` / `md:hidden` CSS classes.

- [ ] **Step 2: Build the server page**

Replace `src/app/(app)/contacts/page.tsx`:

```typescript
import { db } from "@/lib/db";
import { getContacts, getContactStats, getContactBeats } from "@/lib/queries/contact-queries";
import { ContactsListClient } from "@/components/contacts/contacts-list-client";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const [contacts, stats, beats] = await Promise.all([
    getContacts(org.id),
    getContactStats(org.id),
    getContactBeats(org.id),
  ]);

  return (
    <ContactsListClient
      contacts={contacts}
      stats={stats}
      beats={["All", ...beats]}
    />
  );
}
```

The `ContactsListClient` component renders:
1. StatsBar with: Total contacts, A-list count, Warm count, and a 4th stat (e.g., total beats or recently added)
2. FilterPills with beat options
3. Add contact button (top right, primary variant)
4. ContactTable (desktop) / ContactCardList (mobile) — filtered by selected beat
5. SlideOverPanel with ContactForm for adding new contacts

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/contacts/page.tsx src/components/contacts/
git commit -m "feat: build Contacts list page with filters and responsive views"
```

---

### Task 7: Contact Detail — Hero and Info Sidebar

**Files:**
- Create: `src/components/contacts/contact-hero.tsx`
- Create: `src/components/contacts/contact-info-sidebar.tsx`

- [ ] **Step 1: Create ContactHero**

Create `src/components/contacts/contact-hero.tsx` — "use client" component.

Props: `contact` object (full contact data), `stats` (coverageCount, replyRate, campaignCount), `onEdit: () => void`

Renders:
- Card with border, rounded-[10px], p-5
- Top row: Avatar (44px) + name (18px bold) + publication (12px, text-sub) + action buttons
- Action buttons: "Edit" (default, icon: edit), "Email" (default, icon: mail), "Add to campaign" (primary, icon: plus)
- Badges row below name: beat Badge (default), tier Badge (solid for A), health Badge (warm/cool)
- Stats strip: 3-col grid — Coverage count | Reply rate (%) | Campaigns

- [ ] **Step 2: Create ContactInfoSidebar**

Create `src/components/contacts/contact-info-sidebar.tsx` — server component.

Props: `contact` object (with email, phone, instagram, twitter, linkedin, campaignContacts with campaign data)

Renders sidebar cards:
- **Contact Info card**: email, phone, Instagram, Twitter, LinkedIn — each as a labeled row. Show "—" for missing fields.
- **Campaigns card**: list of linked campaigns with client badge + campaign name + status badge. Show "No campaigns" if empty.

Each card: rounded-[10px] border, p-4, with section title (12px, font-semibold, text-sub) at top.

- [ ] **Step 3: Commit**

```bash
git add src/components/contacts/contact-hero.tsx src/components/contacts/contact-info-sidebar.tsx
git commit -m "feat: add ContactHero and ContactInfoSidebar components"
```

---

### Task 8: Contact Detail — Tabs

**Files:**
- Create: `src/components/contacts/contact-tabs.tsx`

- [ ] **Step 1: Create ContactTabs**

Create `src/components/contacts/contact-tabs.tsx` — "use client" component.

Props: `interactions`, `outreaches`, `coverages`, `notes` (from contact data)

4 tabs: Timeline | Pitches | Coverage | Notes

**Timeline tab**: List of interactions ordered by date desc. Each entry: date, type badge, summary text. Empty state: "No interactions yet"

**Pitches tab**: List of outreaches. Each entry: subject, status badge (draft/approved/sent/replied), date. Empty state: "No pitches yet"

**Coverage tab**: List of coverages. Each entry: publication, date, type badge, media value. Empty state: "No coverage yet"

**Notes tab**: Display the contact's notes field in a simple text area or read-only block. If empty: "No notes"

Tab bar styling: same as WorkspaceTabs — horizontal buttons with 2px bottom border accent on active.

- [ ] **Step 2: Commit**

```bash
git add src/components/contacts/contact-tabs.tsx
git commit -m "feat: add ContactTabs with Timeline, Pitches, Coverage, Notes"
```

---

### Task 9: Contact Detail Page (/contacts/[contactId])

**Files:**
- Modify: `src/app/(app)/contacts/[contactId]/page.tsx`

- [ ] **Step 1: Build the contact detail page**

Replace `src/app/(app)/contacts/[contactId]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { getContactById, getContactDetailStats } from "@/lib/queries/contact-queries";
import { ContactDetailClient } from "@/components/contacts/contact-detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ contactId: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { contactId } = await params;

  const [contact, stats] = await Promise.all([
    getContactById(contactId),
    getContactDetailStats(contactId),
  ]);

  if (!contact) {
    notFound();
  }

  return <ContactDetailClient contact={contact} stats={stats} />;
}
```

- [ ] **Step 2: Create ContactDetailClient wrapper**

Create `src/components/contacts/contact-detail-client.tsx` — "use client" component that manages the edit slide-over state.

Layout:
- Mobile: single column — hero, stats, tabs, then info cards below
- Desktop: two-column layout — left (hero + tabs, flex-1), right (info sidebar, w-[320px])

Renders:
1. ContactHero with edit handler that opens SlideOverPanel
2. ContactTabs below hero
3. ContactInfoSidebar in the right column (desktop) or below tabs (mobile)
4. SlideOverPanel with ContactForm for editing

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/contacts/ src/components/contacts/
git commit -m "feat: build Contact detail page with hero, tabs, sidebar"
```

---

### Task 10: Final Verification and Push

- [ ] **Step 1: Full build check**

Run: `npm run build`

- [ ] **Step 2: Dev server testing**

Run: `npm run dev`

Verify:
1. `/contacts` — shows stats bar (zeros initially), empty beat filter (just "All"), add contact button
2. Click "Add contact" — slide-over opens with form
3. Fill form: name, publication, beat, tier, pick colour. Submit.
4. Contact appears in table (desktop) or card list (mobile)
5. Beat filter pills appear with the beats from entered contacts
6. Filter works — selecting a beat filters the list
7. Click a contact → navigates to `/contacts/[id]`
8. Contact detail: hero with avatar, name, publication, badges, stats, action buttons
9. Tabs: Timeline, Pitches, Coverage, Notes — all show empty states
10. Info sidebar: shows email, phone, socials (or dashes)
11. Edit button opens prefilled form, save updates the contact
12. Dark mode: all screens render correctly
13. Mobile: card list, drawer nav works

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Phase 2 Completion Checklist

- [ ] Contact queries (getContacts, getContactById, getContactStats, getContactDetailStats, getContactBeats)
- [ ] Server Actions (createContact, updateContact)
- [ ] StatsBar moved to shared components
- [ ] FilterPills reusable component
- [ ] ContactForm with all fields, color presets, auto-initials
- [ ] ContactTable (desktop) matching mockup
- [ ] ContactCardList (mobile) matching mockup
- [ ] Contacts list page with stats, filters, responsive views
- [ ] ContactHero with avatar, badges, action buttons, stats strip
- [ ] ContactInfoSidebar with contact info + linked campaigns
- [ ] ContactTabs (Timeline, Pitches, Coverage, Notes)
- [ ] Contact detail page with two-column layout
- [ ] All screens work in light and dark mode
- [ ] Mobile responsive
- [ ] Deployed and working on Vercel
