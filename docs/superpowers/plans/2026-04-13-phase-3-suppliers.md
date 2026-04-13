# Phase 3: Suppliers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Suppliers screens — directory with category filter, supplier detail with contacts/campaign history/cost tracking, and add/edit supplier slide-over — so the user can track vendor relationships.

**Architecture:** Mirrors the Contacts pattern exactly: Server Components for pages, Client Components for interactive elements. Suppliers have a unique sub-entity (SupplierContact — people within a supplier company) managed via the detail page. Service category filter pills reuse the shared FilterPills component.

**Tech Stack:** Next.js App Router, Prisma, Server Actions, React Server Components

---

## CSS Variable Reference

Same suffixed names as previous phases — `var(--text-primary)`, `var(--border-custom)`, `var(--text-muted-custom)`, `var(--accent-custom)`, etc.

## File Structure

```
src/
├── actions/
│   └── supplier-actions.ts              # createSupplier, updateSupplier, createSupplierContact, updateSupplierContact
├── lib/queries/
│   └── supplier-queries.ts              # getSuppliers, getSupplierById, getSupplierStats, getServiceCategories
├── components/suppliers/
│   ├── supplier-table.tsx               # Desktop table view
│   ├── supplier-card-list.tsx           # Mobile card list
│   ├── supplier-form.tsx                # Add/edit supplier form
│   ├── supplier-contact-form.tsx        # Add/edit person within supplier
│   ├── supplier-hero.tsx                # Detail page hero
│   ├── supplier-info-sidebar.tsx        # Detail page sidebar (contact info, linked campaigns)
│   ├── supplier-tabs.tsx                # Detail page tabs (Contacts, Campaigns, Cost History)
│   ├── suppliers-list-client.tsx        # List page client wrapper
│   └── supplier-detail-client.tsx       # Detail page client wrapper
├── app/(app)/suppliers/
│   ├── page.tsx                         # Suppliers list (Server Component)
│   └── [supplierId]/
│       └── page.tsx                     # Supplier detail (Server Component)
```

---

### Task 1: Supplier Queries + Actions

**Files:**
- Create: `src/lib/queries/supplier-queries.ts`
- Create: `src/actions/supplier-actions.ts`

- [ ] **Step 1: Create supplier queries**

Create `src/lib/queries/supplier-queries.ts`:

**getSuppliers(organizationId, serviceCategory?)** — returns all suppliers for the org, optionally filtered by serviceCategory. Include `_count` of campaignSuppliers and supplierContacts. Order by name asc.

**getSupplierById(supplierId)** — returns supplier with includes:
- `contacts` (SupplierContact — all fields)
- `campaignSuppliers` with nested campaign (id, name, type, status) and campaign.client (id, name, initials, colour, bgColour)
- `budgetLineItems` with nested campaign (id, name)
Order campaignSuppliers and budgetLineItems by createdAt desc.

**getSupplierStats(organizationId)** — returns: total count, distinct service category count, count linked to campaigns (suppliers with at least one campaignSupplier).

**getServiceCategories(organizationId)** — returns distinct serviceCategory values as string array.

- [ ] **Step 2: Create supplier server actions**

Create `src/actions/supplier-actions.ts` with "use server":

**createSupplier(formData)** — extracts: name, serviceCategory, email, phone, website, notes. Required: name, serviceCategory. Revalidates /suppliers.

**updateSupplier(supplierId, formData)** — same fields plus optional rating (1-5). Revalidates /suppliers and /suppliers/${supplierId}.

**createSupplierContact(formData)** — extracts: supplierId, name, role, email, phone. Required: supplierId, name. Revalidates /suppliers/${supplierId}.

**updateSupplierContact(supplierContactId, formData)** — same fields. Looks up supplierId from the record to revalidate.

**deleteSupplierContact(supplierContactId)** — deletes the supplier contact. Revalidates.

All actions: try/catch with console.error, return actual error messages.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/supplier-queries.ts src/actions/supplier-actions.ts
git commit -m "feat: add supplier queries and server actions"
```

---

### Task 2: Supplier Form + Supplier Contact Form

**Files:**
- Create: `src/components/suppliers/supplier-form.tsx`
- Create: `src/components/suppliers/supplier-contact-form.tsx`

- [ ] **Step 1: Create SupplierForm**

"use client" component. Props: `supplier?: { id, name, serviceCategory, email, phone, website, notes, rating } | null`, `onSuccess: () => void`

Fields:
1. Name (text, required)
2. Service Category (text input with placeholder "e.g., Venue, Catering, Photography, Florals, AV, Styling")
3. Email (email, optional)
4. Phone (text, optional)
5. Website (text, optional)
6. Notes (textarea, optional)
7. Rating (1-5 star buttons, optional — only show in edit mode)
8. Submit button

No avatar/color picker needed — suppliers don't have custom avatars. Use a simple icon badge instead.

Follow the same form styling pattern as ContactForm: inline styles with CSS variables, useTransition, FormData submission.

- [ ] **Step 2: Create SupplierContactForm**

"use client" component. Props: `supplierContact?: { id, name, role, email, phone } | null`, `supplierId: string`, `onSuccess: () => void`

Simple form for adding/editing people within a supplier:
1. Name (text, required)
2. Role (text, optional — placeholder "e.g., Account Manager, Head Chef")
3. Email (email, optional)
4. Phone (text, optional)
5. Submit button

- [ ] **Step 3: Commit**

```bash
git add src/components/suppliers/
git commit -m "feat: add SupplierForm and SupplierContactForm"
```

---

### Task 3: Supplier Table + Card List

**Files:**
- Create: `src/components/suppliers/supplier-table.tsx`
- Create: `src/components/suppliers/supplier-card-list.tsx`

- [ ] **Step 1: Create desktop table**

"use client" component. Props: `suppliers` array with id, name, serviceCategory, email, phone, contactCount, campaignCount.

Table columns: Name | Category | Contact Person | Phone | Campaigns | →
- Name: 13px font-medium, text-primary. No avatar — just the name.
- Category: Badge variant="default"
- Contact Person: first supplier contact name or "—"
- Phone: 12px, text-sub
- Campaigns: count number, 12px, text-sub
- Arrow: chevronR icon
- Rows link to `/suppliers/${id}`, hover bg

- [ ] **Step 2: Create mobile card list**

"use client" component. Same props.

Card layout: rounded-[10px], border, p-3. Name (13px bold) + category Badge + phone (11px) + campaign count. ChevronR on right. Link to detail.

- [ ] **Step 3: Commit**

```bash
git add src/components/suppliers/
git commit -m "feat: add supplier table and card list views"
```

---

### Task 4: Suppliers List Page

**Files:**
- Create: `src/components/suppliers/suppliers-list-client.tsx`
- Modify: `src/app/(app)/suppliers/page.tsx`

- [ ] **Step 1: Create client wrapper**

"use client" component. Props: suppliers array, stats, categories (string[]).

Renders:
1. Header row: "Add supplier" button (primary, icon: plus) on right
2. StatsBar: Total suppliers, Categories count, Linked to campaigns
3. FilterPills: ["All", ...categories] for service category filter
4. SupplierTable (hidden md:block) / SupplierCardList (md:hidden) — filtered by selected category
5. SlideOverPanel with SupplierForm (unmount pattern)
6. Outer padding: `p-4 md:p-6`

Client-side filtering by serviceCategory.

- [ ] **Step 2: Build server page**

Replace `src/app/(app)/suppliers/page.tsx`:
- `export const dynamic = "force-dynamic"`
- Get org, fetch suppliers + stats + categories in parallel
- Serialize data (dates, decimals)
- For each supplier, include first supplier contact name and campaign count
- Render SuppliersListClient

- [ ] **Step 3: Verify build, commit**

```bash
git add src/components/suppliers/ src/app/\(app\)/suppliers/page.tsx
git commit -m "feat: build Suppliers list page with category filter"
```

---

### Task 5: Supplier Detail Components

**Files:**
- Create: `src/components/suppliers/supplier-hero.tsx`
- Create: `src/components/suppliers/supplier-info-sidebar.tsx`
- Create: `src/components/suppliers/supplier-tabs.tsx`

- [ ] **Step 1: Create SupplierHero**

"use client" component. Props: supplier data, stats (contactCount, campaignCount, totalCost), onEdit callback.

Renders Card with:
- Icon badge (suppliers icon, 44px, accent-bg/accent-custom — since suppliers don't have custom avatars)
- Name (18px bold) + category Badge + optional rating (star display)
- Website link if present
- Action buttons: "Edit" (default, icon: edit), "Add to campaign" (primary, icon: plus)
- Stats strip: 3-col — People (supplier contacts count), Campaigns, Total cost (formatted as currency)

- [ ] **Step 2: Create SupplierInfoSidebar**

Server component. Props: supplier with email, phone, website, contacts (SupplierContact[]).

Two cards:
- **Supplier Info**: email, phone, website rows with labels
- **People**: list of SupplierContact entries (name, role, email, phone). Each entry is a small card-like row. If empty: "No contacts added"

- [ ] **Step 3: Create SupplierTabs**

"use client" component. Props: supplierContacts, campaignSuppliers (with campaign+client data), budgetLineItems (with campaign data).

3 tabs: People | Campaigns | Cost History

**People tab**: list of supplier contacts with name, role, email, phone. Each row has edit/delete buttons. "Add person" button at top opens SlideOverPanel with SupplierContactForm.

**Campaigns tab**: list of campaigns this supplier is linked to. Each: client initials badge + campaign name + supplier's role in that campaign + agreed cost + status Badge (pending/confirmed/cancelled). Empty: "Not linked to any campaigns yet"

**Cost History tab**: list of budget line items linked to this supplier. Each: campaign name + description + amount (formatted as currency). Total at bottom. Empty: "No costs recorded"

- [ ] **Step 4: Commit**

```bash
git add src/components/suppliers/
git commit -m "feat: add SupplierHero, InfoSidebar, and Tabs"
```

---

### Task 6: Supplier Detail Page

**Files:**
- Create: `src/components/suppliers/supplier-detail-client.tsx`
- Modify: `src/app/(app)/suppliers/[supplierId]/page.tsx`

- [ ] **Step 1: Create detail client wrapper**

"use client" component. Manages edit slide-over state.

Layout: same two-column pattern as contact detail:
- Left (flex-1): SupplierHero + SupplierTabs
- Right (w-[300px] on md+): SupplierInfoSidebar
- SlideOverPanel with SupplierForm for editing

- [ ] **Step 2: Build server page**

Replace `src/app/(app)/suppliers/[supplierId]/page.tsx`:
- `export const dynamic = "force-dynamic"`
- `const { supplierId } = await params`
- Fetch supplier and compute stats (contactCount, campaignCount, totalCost from budgetLineItems)
- `notFound()` if not found
- Serialize dates/decimals
- Render SupplierDetailClient

- [ ] **Step 3: Verify build, commit**

```bash
git add src/components/suppliers/ src/app/\(app\)/suppliers/
git commit -m "feat: build Supplier detail page with people, campaigns, costs"
```

---

### Task 7: Final Verification + Push

- [ ] **Step 1: Full build check**

Run: `npm run build`

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Phase 3 Completion Checklist

- [ ] Supplier queries (getSuppliers, getSupplierById, getSupplierStats, getServiceCategories)
- [ ] Server Actions (createSupplier, updateSupplier, createSupplierContact, updateSupplierContact, deleteSupplierContact)
- [ ] SupplierForm and SupplierContactForm
- [ ] SupplierTable (desktop) and SupplierCardList (mobile)
- [ ] Suppliers list page with category filter, stats, responsive views
- [ ] SupplierHero with icon badge, stats, action buttons
- [ ] SupplierInfoSidebar with supplier info + people list
- [ ] SupplierTabs (People with add/edit, Campaigns, Cost History)
- [ ] Supplier detail page with two-column layout
- [ ] Light and dark mode
- [ ] Mobile responsive
- [ ] Deployed on Vercel
