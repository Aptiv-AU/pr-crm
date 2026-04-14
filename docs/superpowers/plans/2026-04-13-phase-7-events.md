# Phase 7: Events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Events calendar screen, event detail page with runsheet editor and guest list/RSVP tracking, and an Event Details tab on event-type campaigns.

**Architecture:** The `/events` page shows a month calendar with event campaigns displayed as coloured pills. Clicking an event navigates to `/events/[campaignId]` which shows the event detail with tabs for Runsheet, Guest List, and Suppliers. Event-type campaigns also get an "Event Details" tab on the campaign detail page. EventDetail and RunsheetEntry models already exist in the schema.

**Tech Stack:** Next.js App Router, Prisma, Server Actions

---

## File Structure

```
src/
├── actions/
│   └── event-actions.ts                  # createEventDetail, updateEventDetail, CRUD runsheet entries, RSVP management
├── lib/queries/
│   └── event-queries.ts                  # getEventCampaigns, getEventDetail
├── components/events/
│   ├── events-calendar.tsx               # Month calendar grid with event pills
│   ├── events-list-client.tsx            # Calendar page client wrapper
│   ├── event-detail-client.tsx           # Event detail page client wrapper
│   ├── event-hero.tsx                    # Event detail hero (venue, date, time, guest count)
│   ├── runsheet-editor.tsx               # Runsheet timeline editor (add/edit/reorder entries)
│   ├── guest-list.tsx                    # Guest list with RSVP status management
│   └── event-info-sidebar.tsx            # Event info sidebar (venue, date/time, suppliers)
├── components/campaigns/
│   └── campaign-tabs.tsx                 # Update: add Event Details tab for event campaigns
├── app/(app)/
│   ├── events/
│   │   ├── page.tsx                      # Events calendar page
│   │   └── [campaignId]/
│   │       └── page.tsx                  # Event detail page
```

---

### Task 1: Event Queries + Actions

**Files:**
- Create: `src/lib/queries/event-queries.ts`
- Create: `src/actions/event-actions.ts`

- [ ] **Step 1: Create event queries**

**getEventCampaigns(organizationId)**: Returns all campaigns with type="event". Include client (id, name, initials, colour, bgColour), eventDetail (venue, eventDate, eventTime, guestCount). Order by eventDetail.eventDate asc (nulls last).

**getEventDetail(campaignId)**: Returns the EventDetail for a campaign with all runsheetEntries (ordered by order asc). Also include the campaign's campaignContacts with contact data (for guest list) and campaignSuppliers with supplier data.

- [ ] **Step 2: Create event actions**

**createOrUpdateEventDetail(campaignId, formData)**: Upserts EventDetail. Extracts venue, eventDate, eventTime, guestCount. Uses upsert: create if not exists, update if exists.

**addRunsheetEntry(formData)**: Extracts eventDetailId, time, endTime, activity, assignee, location, notes. Sets order to max(order)+1. Revalidates.

**updateRunsheetEntry(entryId, formData)**: Updates fields. Revalidates.

**deleteRunsheetEntry(entryId)**: Deletes. Revalidates.

**reorderRunsheetEntries(entryIds: string[])**: Updates the order field for each entry based on array position. Revalidates.

**updateGuestRsvp(campaignContactId, status)**: Updates CampaignContact.status to the RSVP status (invited/confirmed/declined/attended). Revalidates.

All with try/catch, revalidatePath for /events and /events/${campaignId} and /campaigns/${campaignId}.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add event queries and server actions"
```

---

### Task 2: Events Calendar

**Files:**
- Create: `src/components/events/events-calendar.tsx`
- Create: `src/components/events/events-list-client.tsx`
- Modify: `src/app/(app)/events/page.tsx`

- [ ] **Step 1: Create EventsCalendar**

"use client". Props: events array (campaign id, name, type, status, client with colour/bgColour/initials/name, eventDetail with eventDate/venue).

Renders a month calendar grid:
- Header: month/year display + prev/next month buttons
- Day-of-week headers: Mon Tue Wed Thu Fri Sat Sun
- 6-row grid of day cells (42 cells covering the month)
- Each cell: day number (top-left), event pills for that day
- Event pill: small rounded rectangle with client bgColour background, client colour text, campaign name truncated. Click navigates to `/events/${campaignId}`.
- Days outside current month: dimmed (text-muted-custom)
- Today: accent border or highlighted background

Use useState for current month/year. Navigate months with prev/next.

Calendar cell height: auto (min-height ~80px to fit pills). On mobile: smaller cells, event pills show only client initials, not full name.

- [ ] **Step 2: Create EventsListClient**

"use client". Props: events array, upcoming events array (next 30 days).

Renders (wrapped in `p-4 md:p-6`):
- Header: "New event" button (primary, icon: plus) → navigates to `/campaigns` with a hint to create an event campaign (or we could open the campaign form directly — keep it simple and just link to campaigns for now)
- Two-column layout on desktop: calendar (flex-1) + upcoming sidebar (w-[280px])
- Mobile: calendar full width, upcoming list below

Upcoming sidebar: list of next 30 days' events. Each: client badge (16px) + campaign name (13px) + venue (12px, text-sub) + date (12px, text-muted-custom).

- [ ] **Step 3: Build server page**

Replace `src/app/(app)/events/page.tsx`:
- `export const dynamic = "force-dynamic"`
- Fetch event campaigns
- Separate upcoming (next 30 days)
- Serialize dates
- Render EventsListClient

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: build Events calendar page"
```

---

### Task 3: Event Detail Components

**Files:**
- Create: `src/components/events/event-hero.tsx`
- Create: `src/components/events/runsheet-editor.tsx`
- Create: `src/components/events/guest-list.tsx`
- Create: `src/components/events/event-info-sidebar.tsx`

- [ ] **Step 1: EventHero**

"use client". Props: campaign (name, type, status, client), eventDetail (venue, eventDate, eventTime, guestCount), onEdit callback.

Card with:
- Client initials badge (20px) + campaign name (18px bold) + "Event" Badge
- Venue name (14px, text-sub) if set
- Date + time (13px, text-primary) if set
- Guest count (13px, text-sub) if set
- "Edit Event Details" button (default, icon: edit) → opens slide-over with event detail form (venue, date, time, guest count fields)

- [ ] **Step 2: RunsheetEditor**

"use client". Props: eventDetailId, entries (RunsheetEntry array).

The core event management feature — an editable timeline of the day:
- List of entries ordered by `order`, each showing: time (bold, 13px) + endTime (if set, "— endTime") + activity (13px) + assignee (12px, text-sub) + location (12px, text-muted-custom)
- Each entry has edit (pencil icon) and delete (X icon) buttons
- "Add entry" button at bottom opens an inline form: time (time input), endTime (time input, optional), activity (text, required), assignee (text, optional), location (text, optional), notes (text, optional)
- Edit opens the same inline form prefilled
- Visual timeline: vertical line on the left connecting time markers (similar to phase stepper design)
- Drag to reorder would be nice but keep it simple — use up/down arrow buttons for reordering instead

- [ ] **Step 3: GuestList**

"use client". Props: campaignId, campaignContacts (with contact data and status), availableContacts.

Renders:
- Header: "Guest List ({count})" + "Add guest" button
- Status filter pills: All / Invited / Confirmed / Declined / Attended
- Guest list: Avatar (26px) + name + publication + RSVP status Badge + status change dropdown
- RSVP status Badge variants: invited→default, confirmed→active, declined→cool, attended→accent
- "Add guest" shows a dropdown of available contacts (same pattern as campaign contacts tab)
- Status dropdown per guest: clicking the badge opens a small dropdown to change status (Invited/Confirmed/Declined/Attended). Calls updateGuestRsvp.

- [ ] **Step 4: EventInfoSidebar**

Server component. Props: eventDetail, campaignSuppliers (with supplier data).

Two cards:
- **Event Info**: venue, date, time, guest count — simple label/value rows
- **Event Suppliers**: list of suppliers linked to this campaign with role and agreed cost

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add event detail components"
```

---

### Task 4: Event Detail Page

**Files:**
- Create: `src/components/events/event-detail-client.tsx`
- Modify: `src/app/(app)/events/[campaignId]/page.tsx`

- [ ] **Step 1: EventDetailClient**

"use client". Props: campaign data, eventDetail, runsheetEntries, campaignContacts, availableContacts, campaignSuppliers.

Layout: two-column on desktop, single column mobile.
- Left (flex-1): EventHero + tabs (Runsheet | Guest List)
- Right (w-[300px]): EventInfoSidebar

Tabs:
- Runsheet: RunsheetEditor
- Guest List: GuestList

SlideOverPanel for editing event details (venue, date, time, guest count).

- [ ] **Step 2: Build server page**

Replace `src/app/(app)/events/[campaignId]/page.tsx`:
- `export const dynamic = "force-dynamic"`
- Fetch campaign via getCampaignById + getEventDetail
- If campaign type !== "event": redirect to `/campaigns/${campaignId}`
- If no eventDetail: create one automatically (empty)
- Fetch available contacts (org contacts not in campaign)
- Serialize
- Render EventDetailClient

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: build Event detail page with runsheet and guest list"
```

---

### Task 5: Campaign Event Details Tab

**Files:**
- Modify: `src/components/campaigns/campaign-tabs.tsx`

- [ ] **Step 1: Add Event Details tab for event campaigns**

When `campaignType === "event"`, add an "Event" tab to the tab list. This tab shows a summary of event details + links to the full event page at `/events/${campaignId}`.

Content: EventHero (compact version) + "View full event details →" link + mini runsheet preview (first 5 entries).

This requires the campaign detail page to fetch eventDetail data for event campaigns. Update the server page to include eventDetail when the campaign type is "event".

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add Event Details tab for event campaigns"
```

---

### Task 6: Final Verification + Push

- [ ] **Step 1: Build check**

Run: `npm run build`

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Phase 7 Completion Checklist

- [ ] Event queries (getEventCampaigns, getEventDetail)
- [ ] Event actions (event detail CRUD, runsheet CRUD, RSVP management)
- [ ] Events calendar page with month grid + upcoming sidebar
- [ ] EventHero with venue, date, time, guest count
- [ ] RunsheetEditor with timeline entries, add/edit/delete/reorder
- [ ] GuestList with RSVP status management
- [ ] EventInfoSidebar with venue info + suppliers
- [ ] Event detail page with tabs (Runsheet, Guest List)
- [ ] Campaign Event Details tab for event campaigns
- [ ] Light/dark mode, mobile responsive
- [ ] Deployed on Vercel
