# Phase 5C: Coverage Tracking + PDF Reports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build coverage logging (with file uploads for clippings), the standalone coverage screen with filtering and media value tracking, the campaign Coverage tab, and branded PDF report generation for campaign end-of-campaign reporting.

**Architecture:** Coverage entries are created via slide-over forms, with clipping images uploaded to Vercel Blob. The standalone `/coverage` screen is an aggregate view with filters by client, campaign, type, and date. The campaign Coverage tab shows coverage for that campaign. PDF reports are generated server-side using `@react-pdf/renderer` and downloaded as branded one-pagers.

**Tech Stack:** Next.js App Router, Prisma, Server Actions, @vercel/blob (file uploads), @react-pdf/renderer (PDF generation)

---

## File Structure

```
src/
├── actions/
│   └── coverage-actions.ts              # createCoverage, updateCoverage, deleteCoverage
├── lib/queries/
│   └── coverage-queries.ts              # getCoverages, getCoverageStats, getCoverageById
├── app/
│   ├── api/
│   │   ├── upload/route.ts              # File upload endpoint (Vercel Blob)
│   │   └── reports/[campaignId]/route.ts # PDF report generation endpoint
│   └── (app)/
│       └── coverage/page.tsx            # Standalone coverage screen
├── components/
│   ├── coverage/
│   │   ├── coverage-form.tsx            # Add/edit coverage slide-over form
│   │   ├── coverage-list-client.tsx     # Standalone coverage page client wrapper
│   │   └── coverage-card.tsx            # Individual coverage entry card
│   └── campaigns/
│       ├── campaign-tabs.tsx            # Update: wire Coverage tab
│       └── campaign-coverage-tab.tsx    # Campaign-specific coverage list + add form
├── lib/
│   └── pdf/
│       └── campaign-report.tsx          # React PDF document template
```

---

### Task 1: Install Dependencies + File Upload

**Files:**
- Modify: `package.json` — install @vercel/blob, @react-pdf/renderer
- Create: `src/app/api/upload/route.ts`

- [ ] **Step 1: Install packages**

```bash
npm install @vercel/blob @react-pdf/renderer
```

- [ ] **Step 2: Create file upload API route**

Create `src/app/api/upload/route.ts` — handles file uploads to Vercel Blob.

POST endpoint:
1. Receives multipart form data with a `file` field
2. Validates file type (image/*, application/pdf) and size (max 10MB)
3. Uploads to Vercel Blob using `put()` from @vercel/blob
4. Returns `{ url: string }` — the public URL of the uploaded file

Requires `BLOB_READ_WRITE_TOKEN` env var (from Vercel dashboard → Storage → Blob).

If the env var isn't set, return the file as a data URL fallback (base64) for local dev.

- [ ] **Step 3: Add env var placeholder**

Add to `.env`:
```
BLOB_READ_WRITE_TOKEN=""
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add file upload API route with Vercel Blob"
```

---

### Task 2: Coverage Queries + Actions

**Files:**
- Create: `src/lib/queries/coverage-queries.ts`
- Create: `src/actions/coverage-actions.ts`

- [ ] **Step 1: Create coverage queries**

**getCoverages(organizationId, filters?)**: filters: `{ campaignId?, clientId?, type?, dateFrom?, dateTo? }`. Include campaign (id, name, client: id/name/initials/colour/bgColour) and contact (id, name). Order by date desc.

**getCoverageStats(organizationId)**: total count, total media value (sum), this month's count, top publication (most frequent publication name).

**getCoverageByCampaign(campaignId)**: all coverage for a campaign. Include contact info. Order by date desc.

**getCoverageById(coverageId)**: single coverage with all relations.

- [ ] **Step 2: Create coverage server actions**

**createCoverage(formData)**: Extracts: campaignId, contactId (both optional), publication (required), date (required), type (required — feature/mention/review/social), url, mediaValue (parse as float), attachmentUrl, notes. Gets orgId. Revalidates /coverage and /campaigns/${campaignId} if set.

**updateCoverage(coverageId, formData)**: Same fields. Revalidates.

**deleteCoverage(coverageId)**: Deletes. Revalidates.

All with try/catch, console.error, actual error messages.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add coverage queries and server actions"
```

---

### Task 3: Coverage Form + Card

**Files:**
- Create: `src/components/coverage/coverage-form.tsx`
- Create: `src/components/coverage/coverage-card.tsx`

- [ ] **Step 1: Create CoverageForm**

"use client". Props: `coverage?: existing coverage data | null`, `campaigns: { id, name, client: { name } }[]`, `contacts: { id, name }[]`, `onSuccess: () => void`

Fields:
1. Publication (text, required — placeholder "e.g., Vogue Australia")
2. Date (date input, required — default today)
3. Type (select: Feature / Mention / Review / Social)
4. Campaign (optional select dropdown — list of campaigns)
5. Contact (optional select — journalist who published it)
6. URL (text, optional — link to the article)
7. Media Value (number input with $ prefix, optional)
8. Clipping upload (file input — images/PDFs. On select: upload to /api/upload, store returned URL)
9. Notes (textarea, optional)

Show uploaded clipping as a thumbnail preview if it's an image.

Follow same form styling patterns (inputStyle, labelStyle, CSS variables).

- [ ] **Step 2: Create CoverageCard**

"use client" or server component. Props: individual coverage entry with campaign and contact info.

Renders a card:
- Row 1: publication name (14px, font-semibold) + type Badge (feature→active, mention→default, review→accent, social→outreach) + date (12px, text-muted-custom, formatted "Apr 13, 2026")
- Row 2: campaign name with client badge (if linked) + contact name (if linked) — 12px, text-sub
- Row 3: media value formatted as currency ($1,234) if set. URL as clickable link "View article →" if set.
- Clipping thumbnail (if attachmentUrl exists): small image preview (60x60, rounded, object-cover). Click to open full size.
- Actions: Edit button, Delete button (ghost, small)

Card styling: border border-custom, rounded-[10px], p-4.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add CoverageForm and CoverageCard components"
```

---

### Task 4: Campaign Coverage Tab

**Files:**
- Create: `src/components/campaigns/campaign-coverage-tab.tsx`
- Modify: `src/components/campaigns/campaign-tabs.tsx`

- [ ] **Step 1: Create CampaignCoverageTab**

"use client". Props: campaignId, coverages array (with contact data), campaigns list (just this campaign for the form), contacts list.

Renders:
- "Add coverage" button (primary, icon: plus) at top right
- StatsBar: Total hits, Total media value (formatted), Top publication
- List of CoverageCard components
- SlideOverPanel with CoverageForm (unmount pattern)
- Empty state: "No coverage logged yet"

- [ ] **Step 2: Wire into campaign-tabs.tsx**

Replace the Coverage tab placeholder with CampaignCoverageTab. Read current campaign-tabs.tsx to understand what data is available. The campaign detail page already fetches coverages via getCampaignById — make sure the data flows through.

May need to update the campaign detail server page to fetch contacts for the coverage form's contact dropdown.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add Campaign Coverage tab with form and cards"
```

---

### Task 5: Standalone Coverage Screen

**Files:**
- Create: `src/components/coverage/coverage-list-client.tsx`
- Modify: `src/app/(app)/coverage/page.tsx`

- [ ] **Step 1: Create CoverageListClient**

"use client". Props: coverages array (with campaign+client+contact data, serialized), stats, campaigns (for form + filter), contacts (for form).

Renders (wrapped in `p-4 md:p-6`):
1. Header: "Add coverage" button (primary, icon: plus) on right
2. StatsBar: Total hits, Total media value, This month, Top publication
3. Filter row: type FilterPills (All/Feature/Mention/Review/Social) + campaign select dropdown (All campaigns + each)
4. Coverage cards list, filtered client-side by type and campaign
5. SlideOverPanel with CoverageForm (unmount pattern)

- [ ] **Step 2: Build server page**

Replace `src/app/(app)/coverage/page.tsx`:
- `export const dynamic = "force-dynamic"`
- Fetch coverages, stats, campaigns (for filter/form), contacts (for form) in parallel
- Serialize dates/decimals
- Render CoverageListClient

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: build standalone Coverage screen with filters"
```

---

### Task 6: PDF Report Generation

**Files:**
- Create: `src/lib/pdf/campaign-report.tsx`
- Create: `src/app/api/reports/[campaignId]/route.ts`
- Modify: `src/components/campaigns/campaign-hero.tsx` — enable Export Report button

- [ ] **Step 1: Create PDF template**

Create `src/lib/pdf/campaign-report.tsx` using `@react-pdf/renderer`.

This is a React component that renders a PDF document. It receives campaign data and generates a branded one-pager.

Layout:
- **Header**: Organization logo (if URL exists, render as Image), org name, "Campaign Report", report date
- **Campaign hero**: client name with brand colour accent bar, campaign name, type, date range
- **Metrics row**: 4 boxes — Outreach sent, Reply rate, Coverage hits, Total media value
- **Coverage table**: columns — Publication, Date, Type, Media Value. One row per coverage entry.
- **Footer**: "Prepared by [org name]" + org contact email

Use `@react-pdf/renderer` components: Document, Page, View, Text, Image, StyleSheet.

Styling: use the org's primaryColour (or default accent blue) for header bar and accents. Client's colour for campaign section accent.

Currency formatting: use org currency (AUD by default).

- [ ] **Step 2: Create PDF API route**

Create `src/app/api/reports/[campaignId]/route.ts`:

GET endpoint:
1. Receives campaignId from URL params
2. Fetches campaign with: client, coverages, outreaches (for stats), org (for branding)
3. Computes stats: outreach count, reply rate, coverage count, total media value
4. Renders the PDF using `renderToBuffer` from @react-pdf/renderer
5. Returns Response with `content-type: application/pdf` and `Content-Disposition: attachment; filename="[ClientName]-[CampaignName]-Report.pdf"`

- [ ] **Step 3: Enable Export Report button**

In `src/components/campaigns/campaign-hero.tsx`: the "Export report" button is currently disabled. Enable it — on click, navigate to `/api/reports/${campaignId}` which triggers a PDF download. Use `window.open()` or an `<a>` tag with download attribute.

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add PDF campaign report generation with branding"
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

## Env Vars Needed

- `BLOB_READ_WRITE_TOKEN` — from Vercel dashboard → Storage → Create Blob Store. Needed for clipping uploads.
- Without it: uploads won't work on Vercel (local dev can use base64 fallback)

## Phase 5C Completion Checklist

- [ ] File upload API route (Vercel Blob)
- [ ] Coverage queries (getCoverages, getCoverageStats, getCoverageByCampaign)
- [ ] Coverage actions (create, update, delete)
- [ ] CoverageForm with publication, date, type, campaign/contact links, URL, media value, clipping upload
- [ ] CoverageCard with type badge, media value, clipping thumbnail
- [ ] Campaign Coverage tab with form and cards
- [ ] Standalone /coverage screen with type/campaign filters
- [ ] PDF campaign report template with org/client branding
- [ ] PDF download API route
- [ ] Export Report button enabled on campaign hero
- [ ] Light/dark mode, mobile responsive
- [ ] Deployed on Vercel
