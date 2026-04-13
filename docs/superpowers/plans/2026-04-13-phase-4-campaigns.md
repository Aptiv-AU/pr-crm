# Phase 4: Campaigns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Campaigns screens — list with type/status/client filters, campaign detail with phases, contacts, suppliers, budget line items, and campaign creation with type-specific workflow phase templates.

**Architecture:** Server Components for pages, Client Components for interactive elements (filters, tabs, forms, phase management). Campaign creation auto-generates workflow phases based on type (press/event/gifting). Budget line items can optionally link to suppliers. Contacts and suppliers are linked to campaigns via join tables with per-record status tracking.

**Tech Stack:** Next.js App Router, Prisma, Server Actions, React Server Components

---

## Key Data: Default Campaign Phases by Type

When a campaign is created, auto-generate these phases:
- **Press:** Research → Draft Pitches → Outreach → Follow-up → Coverage Tracking
- **Event:** Planning → Invite List → Send Invitations → Track RSVPs → Logistics & Runsheet → Post-event Follow-up
- **Gifting:** Select Products → Build Send List → Ship & Track → Follow-up → Coverage Tracking

## CSS Variable Reference

Same as previous phases — `var(--text-primary)`, `var(--border-custom)`, `var(--accent-custom)`, etc.

## Existing Components to Reuse

- `CampaignCard` from `src/components/workspaces/campaign-card.tsx` — already built for workspace view, reuse in campaigns list
- `StatsBar`, `FilterPills`, `SlideOverPanel` from `src/components/shared/`
- All UI primitives from `src/components/ui/`

## File Structure

```
src/
├── actions/
│   └── campaign-actions.ts              # create, update, manage phases/contacts/suppliers/budget
├── lib/queries/
│   └── campaign-queries.ts              # getCampaigns, getCampaignById, getCampaignStats
├── components/campaigns/
│   ├── campaign-form.tsx                # Create/edit campaign form
│   ├── campaign-hero.tsx                # Detail page hero
│   ├── campaign-phase-list.tsx          # Phase workflow display with status toggles
│   ├── campaign-budget.tsx              # Budget tab with line items
│   ├── campaign-contacts-tab.tsx        # Contacts tab with add/remove
│   ├── campaign-suppliers-tab.tsx       # Suppliers tab with add/remove
│   ├── campaign-tabs.tsx                # Tab navigation wrapper
│   ├── campaigns-list-client.tsx        # List page client wrapper
│   └── campaign-detail-client.tsx       # Detail page client wrapper
├── app/(app)/campaigns/
│   ├── page.tsx                         # Campaigns list
│   └── [campaignId]/
│       └── page.tsx                     # Campaign detail
```

---

### Task 1: Campaign Queries

**Files:**
- Create: `src/lib/queries/campaign-queries.ts`

- [ ] **Step 1: Create campaign queries**

**getCampaigns(organizationId, filters?)**: Returns all campaigns with optional filters for type, status, clientId. Include client (id, name, initials, colour, bgColour), _count of campaignContacts and outreaches and coverages. Order by createdAt desc.

**getCampaignById(campaignId)**: Returns campaign with full includes:
- client (id, name, industry, initials, colour, bgColour)
- phases (all fields, ordered by `order` asc)
- campaignContacts with contact (id, name, initials, avatarBg, avatarFg, publication, beat, tier, health)
- campaignSuppliers with supplier (id, name, serviceCategory)
- budgetLineItems with optional supplier (id, name)
- outreaches (id, subject, status, contactId, createdAt)
- coverages (id, publication, date, type, mediaValue)

**getCampaignStats(organizationId)**: total count, active count (status "active"), draft count, complete count.

**getCampaignFilters(organizationId)**: returns distinct types and the list of clients (id, name) for filter dropdowns.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add campaign query functions"
```

---

### Task 2: Campaign Server Actions

**Files:**
- Create: `src/actions/campaign-actions.ts`

- [ ] **Step 1: Create campaign actions**

**createCampaign(formData)**: Extracts name, type, clientId, status (default "draft"), budget, startDate, dueDate, brief. Required: name, type, clientId. After creating the campaign, auto-generate CampaignPhase records based on type:

```typescript
const PHASE_TEMPLATES: Record<string, string[]> = {
  press: ["Research", "Draft Pitches", "Outreach", "Follow-up", "Coverage Tracking"],
  event: ["Planning", "Invite List", "Send Invitations", "Track RSVPs", "Logistics & Runsheet", "Post-event Follow-up"],
  gifting: ["Select Products", "Build Send List", "Ship & Track", "Follow-up", "Coverage Tracking"],
};
```

Create phases with incrementing `order` values, status "pending", first phase "active". Set campaign's currentPhase to the first phase name. Revalidates /campaigns and /workspaces.

**updateCampaign(campaignId, formData)**: name, status, budget, startDate, dueDate, brief. Revalidates /campaigns and /campaigns/${id} and /workspaces.

**updatePhaseStatus(phaseId, status)**: Updates a CampaignPhase status to "pending"/"active"/"complete". If marking complete, auto-advance: set the next phase (by order) to "active" and update campaign's currentPhase. Revalidates campaign paths.

**addContactToCampaign(campaignId, contactId)**: Creates CampaignContact with status "added". Revalidates.

**removeContactFromCampaign(campaignContactId)**: Deletes the CampaignContact. Revalidates.

**addSupplierToCampaign(formData)**: campaignId, supplierId, role, agreedCost. Creates CampaignSupplier. Revalidates.

**removeSupplierFromCampaign(campaignSupplierId)**: Deletes. Revalidates.

**addBudgetLineItem(formData)**: campaignId, description, amount, optional supplierId. Creates BudgetLineItem. Revalidates.

**deleteBudgetLineItem(lineItemId)**: Deletes. Revalidates.

All with try/catch, console.error, actual error messages.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add campaign server actions with phase templates"
```

---

### Task 3: Campaign Form

**Files:**
- Create: `src/components/campaigns/campaign-form.tsx`

- [ ] **Step 1: Create CampaignForm**

"use client". Props: `campaign?: { id, name, type, status, budget, startDate, dueDate, brief, clientId } | null`, `clients: { id, name, initials, colour, bgColour }[]`, `onSuccess: () => void`

Fields:
1. Client (select dropdown — show client initials badge + name for each option). Required. Disabled in edit mode.
2. Campaign name (text, required)
3. Type (3 toggle buttons: Press / Event / Gifting). Disabled in edit mode (type determines phases).
4. Status (select: Draft / Active / Outreach / Complete) — only in edit mode
5. Budget (number input, optional — with $ prefix)
6. Start date (date input, optional)
7. Due date (date input, optional)
8. Brief (textarea, optional — placeholder: "Key messages, angle, assets...")

Auto-generate a campaign name suggestion when client and type are selected (e.g., "[Client] [Type] [Season Year]" — but just as placeholder, user can change).

Submit via FormData to createCampaign or updateCampaign.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add CampaignForm with client select and type toggle"
```

---

### Task 4: Campaign Detail Components

**Files:**
- Create: `src/components/campaigns/campaign-hero.tsx`
- Create: `src/components/campaigns/campaign-phase-list.tsx`
- Create: `src/components/campaigns/campaign-budget.tsx`
- Create: `src/components/campaigns/campaign-contacts-tab.tsx`
- Create: `src/components/campaigns/campaign-suppliers-tab.tsx`
- Create: `src/components/campaigns/campaign-tabs.tsx`

- [ ] **Step 1: CampaignHero**

"use client". Props: campaign data (with client), budget stats (total budget, spent), onEdit callback.

Card with:
- Client initials badge (20px) + campaign name (18px bold) + type Badge + status Badge
- Client name (12px, text-sub)
- Budget progress: "Spent $X of $Y" with progress bar (3px). If no budget: "No budget set"
- Action buttons: "Edit" (default, icon: edit), "Export report" (default, icon: campaigns — disabled/greyed, coming in Phase 6)
- Date range: startDate — dueDate (12px, text-muted-custom) if set

- [ ] **Step 2: CampaignPhaseList**

"use client". Props: phases array, onUpdatePhase callback.

Renders the workflow as a vertical list:
- Each phase: status indicator (circle — empty for pending, half-filled for active, filled checkmark for complete) + phase name + status text
- Active phase highlighted with accent styling
- Click a pending phase → mark previous as complete and this as active
- Click active phase → mark as complete, advance to next
- Visual connector line between phases (vertical line on left)

- [ ] **Step 3: CampaignBudget**

"use client". Props: lineItems array (with supplier info), campaignId, totalBudget.

Renders:
- Summary row: "Budget: $X / $Y" or "$X spent" if no budget set
- Line items table: description, supplier name (or "—"), amount. Each row has a delete button (X icon).
- "Add line item" button → inline form or SlideOverPanel with: description (text), amount (number), supplier (optional select). Calls addBudgetLineItem.

- [ ] **Step 4: CampaignContactsTab**

"use client". Props: campaignContacts (with contact data), campaignId, orgContacts (all org contacts for the add dropdown).

Renders:
- List of linked contacts: Avatar + name + publication + status Badge (added/pitched/replied/covered) + remove button
- "Add contact" button → dropdown/combobox showing org contacts not yet in this campaign. Calls addContactToCampaign.

- [ ] **Step 5: CampaignSuppliersTab**

"use client". Props: campaignSuppliers (with supplier data), campaignId, orgSuppliers.

Renders:
- List of linked suppliers: supplier name + role + agreed cost + status Badge + remove button
- "Add supplier" button → SlideOverPanel with: supplier select, role (text), agreed cost (number). Calls addSupplierToCampaign.

- [ ] **Step 6: CampaignTabs**

"use client". Wraps all tab content.

5 tabs: Phases | Contacts | Suppliers | Budget | Coverage

- Phases tab: CampaignPhaseList
- Contacts tab: CampaignContactsTab
- Suppliers tab: CampaignSuppliersTab
- Budget tab: CampaignBudget
- Coverage tab: placeholder "Coming in Phase 6"

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add campaign detail components"
```

---

### Task 5: Campaigns List Page

**Files:**
- Create: `src/components/campaigns/campaigns-list-client.tsx`
- Modify: `src/app/(app)/campaigns/page.tsx`

- [ ] **Step 1: CampaignsListClient**

"use client". Props: campaigns array (with client data and counts), stats, clients for filter, types for filter.

Renders (wrapped in `p-4 md:p-6`):
1. Header: "New campaign" Button (primary, icon: plus) on right
2. StatsBar: Total, Active, Draft, Complete
3. Filter row: type FilterPills (All/Press/Event/Gifting) + client select dropdown + status select
4. Campaign cards grid (1-col mobile, 2-col desktop) — reuse CampaignCard from workspaces or build a richer version with client badge
5. SlideOverPanel with CampaignForm (unmount pattern)

Each campaign card in the list should show the client badge (initials) alongside the campaign info since this is the all-campaigns view.

Client-side filtering by type, status, and client.

- [ ] **Step 2: Server page**

Replace `src/app/(app)/campaigns/page.tsx`:
- `export const dynamic = "force-dynamic"`
- Fetch campaigns, stats, filters in parallel
- Serialize dates/decimals
- Render CampaignsListClient

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: build Campaigns list page with filters"
```

---

### Task 6: Campaign Detail Page

**Files:**
- Create: `src/components/campaigns/campaign-detail-client.tsx`
- Modify: `src/app/(app)/campaigns/[campaignId]/page.tsx`

- [ ] **Step 1: CampaignDetailClient**

"use client". Manages edit slide-over.

Layout: single column (campaigns are content-heavy, sidebar adds clutter):
- CampaignHero
- CampaignTabs (full width)
- SlideOverPanel with CampaignForm for editing

- [ ] **Step 2: Server page**

Replace `src/app/(app)/campaigns/[campaignId]/page.tsx`:
- `export const dynamic = "force-dynamic"`
- Fetch campaign via getCampaignById + org contacts + org suppliers (for add dropdowns)
- Compute budget stats (sum of line items vs campaign budget)
- Serialize
- Render CampaignDetailClient

- [ ] **Step 3: Verify build, commit**

```bash
git commit -m "feat: build Campaign detail page"
```

---

### Task 7: Final Verification + Push

- [ ] **Step 1: Build check**

Run: `npm run build`

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Phase 4 Completion Checklist

- [ ] Campaign queries with type/status/client filters
- [ ] Server Actions: create (with phase templates), update, phase management, link contacts/suppliers, budget line items
- [ ] CampaignForm with client select, type toggle, budget, dates, brief
- [ ] CampaignHero with client badge, budget progress, dates
- [ ] CampaignPhaseList with visual workflow and status toggling
- [ ] CampaignBudget with line items, supplier links, totals
- [ ] CampaignContactsTab with add/remove contacts
- [ ] CampaignSuppliersTab with add/remove suppliers
- [ ] CampaignTabs (Phases, Contacts, Suppliers, Budget, Coverage placeholder)
- [ ] Campaigns list page with type/status/client filters
- [ ] Campaign detail page
- [ ] Light/dark mode, mobile responsive
- [ ] Deployed on Vercel
