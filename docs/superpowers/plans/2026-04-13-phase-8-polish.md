# Phase 8: Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add global search (Cmd+K), dynamic sidebar badges, proper empty states across all screens, and clean up remaining placeholder text — making the prototype feel finished.

**Architecture:** Global search uses a modal dialog (command palette style) that queries across all entities via a single server action. Sidebar badges pull live counts. Empty states use a consistent shared component. Workspace tabs update to reflect built features.

**Tech Stack:** Next.js App Router, Prisma, Server Actions

---

## File Structure

```
src/
├── components/
│   ├── shared/
│   │   ├── global-search.tsx             # Cmd+K search modal
│   │   └── empty-state.tsx               # Reusable empty state component
│   ├── layout/
│   │   ├── sidebar.tsx                   # Update: dynamic badges, user from DB
│   │   ├── mobile-drawer.tsx             # Update: same as sidebar
│   │   └── topbar.tsx                    # Update: wire search trigger
│   └── workspaces/
│       └── workspace-tabs.tsx            # Update: remove stale phase references
├── actions/
│   └── search-actions.ts                 # Global search server action
├── app/(app)/
│   └── layout.tsx                        # Update: pass badge counts + user data
```

---

### Task 1: Empty State Component

**Files:**
- Create: `src/components/shared/empty-state.tsx`

- [ ] **Step 1: Create reusable EmptyState**

Create `src/components/shared/empty-state.tsx` — server component.

Props: `icon` (IconName), `title` (string), `description` (string), `action?` (ReactNode — optional button/link)

Renders a centered block:
- Icon (24px, text-muted-custom) centered
- Title (14px, font-semibold, text-primary) below
- Description (12px, text-muted-custom) below
- Optional action element below (e.g., a Button)
- Padding: 40px vertical, centered text

- [ ] **Step 2: Add empty states to contacts, suppliers, campaigns, coverage, outreach, events**

Update these components to use EmptyState when their lists are empty:

- `contacts-list-client.tsx` — when filtered contacts is 0: "No contacts match this filter" with "Clear filter" action
- `contact-table.tsx` / `contact-card-list.tsx` — when contacts array is empty: "No contacts yet" with "Add your first contact" 
- `suppliers-list-client.tsx` — when filtered suppliers is 0
- `campaigns-list-client.tsx` — when filtered campaigns is 0
- `coverage-list-client.tsx` — when filtered coverages is 0
- `outreach-list-client.tsx` — when outreaches is 0
- Workspaces page — when zero clients: show a welcoming empty state instead of empty grid

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add EmptyState component and wire across all screens"
```

---

### Task 2: Dynamic Sidebar Badges

**Files:**
- Modify: `src/app/(app)/layout.tsx` — fetch counts
- Modify: `src/components/layout/sidebar.tsx` — accept + display badge counts
- Modify: `src/components/layout/mobile-drawer.tsx` — same
- Modify: `src/components/layout/app-shell.tsx` — pass counts

- [ ] **Step 1: Fetch badge counts in layout**

In `src/app/(app)/layout.tsx`, add parallel queries for nav badge counts:
```typescript
const [contactCount, campaignCount, outreachDraftCount] = await Promise.all([
  db.contact.count({ where: { organizationId: org.id } }),
  db.campaign.count({ where: { organizationId: org.id, status: { not: "complete" } } }),
  db.outreach.count({ where: { campaign: { organizationId: org.id }, status: "draft" } }),
]);
```

Pass as `badgeCounts: { contacts: contactCount, campaigns: campaignCount, outreach: outreachDraftCount }` to AppShell.

- [ ] **Step 2: Update AppShell, Sidebar, MobileDrawer**

Add `badgeCounts` prop to AppShell, pass to Sidebar and MobileDrawer.

In Sidebar and MobileDrawer, replace the hardcoded badge values. Show badges only on:
- Contacts: total contact count
- Campaigns: active campaign count
- Outreach: draft outreach count (pitches awaiting review)

Other nav items: no badge.

- [ ] **Step 3: Update user display from DB**

In the layout, also fetch the user/org data for the sidebar user display:
```typescript
const user = await db.user.findFirst({ where: { organizationId: org.id } });
```

Pass `userData: { name: user?.name ?? org.name, initials: (user?.name ?? org.name).split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2), orgName: org.name }` to AppShell → Sidebar/MobileDrawer.

Replace the hardcoded "Natalie White" / "NW" / "NWPR" with the dynamic values. If no user exists yet, fall back to the org name.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add dynamic sidebar badges and user display"
```

---

### Task 3: Global Search (Cmd+K)

**Files:**
- Create: `src/actions/search-actions.ts`
- Create: `src/components/shared/global-search.tsx`
- Modify: `src/components/layout/topbar.tsx` — wire search trigger
- Modify: `src/components/layout/app-shell.tsx` — render search modal

- [ ] **Step 1: Create search server action**

Create `src/actions/search-actions.ts`:

```typescript
"use server";
import { db } from "@/lib/db";

interface SearchResult {
  type: "client" | "contact" | "campaign" | "supplier" | "coverage";
  id: string;
  title: string;
  subtitle: string;
  href: string;
  colour?: string;
  bgColour?: string;
  initials?: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  
  const org = await db.organization.findFirst();
  if (!org) return [];

  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  // Search clients
  const clients = await db.client.findMany({
    where: { organizationId: org.id, name: { contains: q, mode: "insensitive" } },
    take: 5,
    select: { id: true, name: true, industry: true, initials: true, colour: true, bgColour: true },
  });
  clients.forEach(c => results.push({
    type: "client", id: c.id, title: c.name, subtitle: c.industry,
    href: `/workspaces/${c.id}`, colour: c.colour, bgColour: c.bgColour, initials: c.initials,
  }));

  // Search contacts
  const contacts = await db.contact.findMany({
    where: { organizationId: org.id, OR: [
      { name: { contains: q, mode: "insensitive" } },
      { publication: { contains: q, mode: "insensitive" } },
    ]},
    take: 5,
    select: { id: true, name: true, publication: true, initials: true, avatarBg: true, avatarFg: true },
  });
  contacts.forEach(c => results.push({
    type: "contact", id: c.id, title: c.name, subtitle: c.publication,
    href: `/contacts/${c.id}`, colour: c.avatarFg, bgColour: c.avatarBg, initials: c.initials,
  }));

  // Search campaigns
  const campaigns = await db.campaign.findMany({
    where: { organizationId: org.id, name: { contains: q, mode: "insensitive" } },
    take: 5,
    include: { client: { select: { name: true } } },
  });
  campaigns.forEach(c => results.push({
    type: "campaign", id: c.id, title: c.name, subtitle: c.client.name,
    href: `/campaigns/${c.id}`,
  }));

  // Search suppliers
  const suppliers = await db.supplier.findMany({
    where: { organizationId: org.id, name: { contains: q, mode: "insensitive" } },
    take: 5,
    select: { id: true, name: true, serviceCategory: true },
  });
  suppliers.forEach(s => results.push({
    type: "supplier", id: s.id, title: s.name, subtitle: s.serviceCategory,
    href: `/suppliers/${s.id}`,
  }));

  return results.slice(0, 15);
}
```

- [ ] **Step 2: Create GlobalSearch modal**

Create `src/components/shared/global-search.tsx` — "use client".

A command palette-style modal:
- Triggered by Cmd+K (Mac) or Ctrl+K (Windows)
- Also triggered by clicking the search bar in the topbar
- Fixed overlay with centered modal (max-width 500px)
- Search input at top (auto-focused, with search icon)
- Results grouped by type (Clients, Contacts, Campaigns, Suppliers)
- Each result: small avatar/icon + title + subtitle + type label
- Click result → navigate + close modal
- Keyboard nav: arrow keys to select, Enter to navigate, Escape to close
- Debounced search: 300ms after typing stops

Uses `useTransition` for the search call. Renders results as a list.

Register the Cmd+K listener via useEffect on the document.

- [ ] **Step 3: Wire into topbar**

In `src/components/layout/topbar.tsx`:
- The search placeholder div becomes a button that calls `onSearchClick`
- Add `onSearchClick` prop to TopbarProps
- Mobile search icon button also calls `onSearchClick`

In `src/components/layout/app-shell.tsx`:
- Add `searchOpen` state
- Render `<GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />`
- Pass `onSearchClick={() => setSearchOpen(true)}` to Topbar
- Also register the Cmd+K keyboard shortcut here (or let GlobalSearch handle it)

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add global search with Cmd+K command palette"
```

---

### Task 4: Clean Up Stale Placeholders

**Files:**
- Modify: `src/components/workspaces/workspace-tabs.tsx` — update Outreach + Coverage tab content
- Modify: `src/components/campaigns/phase-coverage.tsx` — update if still showing old placeholder text

- [ ] **Step 1: Update workspace tabs**

In `workspace-tabs.tsx`, the Outreach and Coverage tabs still show "Coming in Phase 5" and "Coming in Phase 6". These features are now built. Update them:

- **Outreach tab**: show a summary of outreach activity for this client's campaigns. Simple list: "X pitches drafted, Y sent, Z replied across N campaigns". Or link to the campaign outreach tabs.
- **Coverage tab**: show coverage entries linked to this client's campaigns. Use a simple list similar to the contact detail coverage tab.

If building the full data fetching is too much, at minimum update the text to something useful: "View outreach in each campaign's Outreach tab" and "View coverage in each campaign's Coverage tab" with links to the campaigns.

- [ ] **Step 2: Clean up any remaining "Coming in Phase X" text**

Search the codebase for "Coming in Phase" and update or remove any remaining references.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: clean up stale placeholder text"
```

---

### Task 5: Final Verification + Push

- [ ] **Step 1: Build check**

Run: `npm run build`

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Phase 8 Completion Checklist

- [ ] EmptyState shared component
- [ ] Empty states on all list screens (contacts, suppliers, campaigns, coverage, outreach, events, workspaces)
- [ ] Dynamic sidebar badges (contact count, campaign count, outreach draft count)
- [ ] User display from database (not hardcoded)
- [ ] Global search action (searches across clients, contacts, campaigns, suppliers)
- [ ] Global search modal (Cmd+K command palette)
- [ ] Search wired to topbar (desktop + mobile)
- [ ] Stale placeholder text cleaned up
- [ ] Light/dark mode verified
- [ ] Mobile responsive verified
- [ ] Deployed on Vercel
