# Phase 5A: Draft Pitches & AI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert press campaign phases from status checkboxes into functional stages, with AI-powered pitch drafting via Claude API as the core feature of the "Draft Pitches" phase.

**Architecture:** The campaign detail Phases tab becomes a stepper with expandable content panels. The "Draft Pitches" panel contains: brief editor, contact selector (with AI suggest), pitch generation (Claude API streaming), and draft review/approval cards. A new streaming API route handles Claude API calls. The standalone /outreach screen becomes an aggregate view.

**Tech Stack:** Next.js App Router, Prisma, Claude API (@anthropic-ai/sdk), Server Actions, Streaming API Routes

**Design Spec:** `docs/superpowers/specs/2026-04-13-phase-5a-draft-pitches-design.md`

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── generate-pitches/
│   │       └── route.ts                    # Streaming API for Claude pitch generation
│   └── (app)/
│       ├── campaigns/[campaignId]/page.tsx  # Update: pass outreach data
│       └── outreach/page.tsx               # Replace: aggregate outreach view
├── actions/
│   ├── campaign-actions.ts                 # Update: press phase template (5→3)
│   └── outreach-actions.ts                 # New: createOutreach, updateOutreach, approveOutreach, deleteOutreach, saveBrief
├── lib/
│   └── ai/
│       └── prompts.ts                      # AI prompt templates for pitch generation + contact suggestion
├── components/campaigns/
│   ├── campaign-tabs.tsx                   # Update: add functional phase content
│   ├── campaign-phase-list.tsx             # Update: stepper with content panels
│   ├── phase-draft-pitches.tsx             # New: Draft Pitches phase content
│   ├── phase-outreach.tsx                  # New: placeholder for Phase 5B
│   ├── phase-coverage.tsx                  # New: placeholder for Phase 5C
│   ├── pitch-card.tsx                      # New: individual draft review card
│   └── contact-picker.tsx                  # New: contact selector with AI suggest
├── components/outreach/
│   └── outreach-list-client.tsx            # New: aggregate outreach view
prisma/
│   └── schema.prisma                       # Update: add follow-up fields to Outreach
```

---

### Task 1: Schema Migration + Install SDK

**Files:**
- Modify: `prisma/schema.prisma` — add fields to Outreach model
- Modify: `package.json` — install @anthropic-ai/sdk
- Modify: `src/actions/campaign-actions.ts` — update press PHASE_TEMPLATES

- [ ] **Step 1: Add fields to Outreach model**

In `prisma/schema.prisma`, add these fields to the Outreach model (after the existing fields, before `createdAt`):
```prisma
  followUpNumber  Int       @default(0)
  scheduledAt     DateTime?
  sentVia         String?
  messageId       String?
  conversationId  String?
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-outreach-followup-fields
```

- [ ] **Step 3: Install Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 4: Update press phase template**

In `src/actions/campaign-actions.ts`, update the PHASE_TEMPLATES:
```typescript
const PHASE_TEMPLATES: Record<string, string[]> = {
  press: ["Draft Pitches", "Outreach", "Coverage"],
  event: ["Planning", "Invite List", "Send Invitations", "Track RSVPs", "Logistics & Runsheet", "Post-event Follow-up"],
  gifting: ["Select Products", "Build Send List", "Ship & Track", "Follow-up", "Coverage Tracking"],
};
```

- [ ] **Step 5: Add .env.local entry for Anthropic API key**

Add to `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Add to `.env` (for reference):
```
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

- [ ] **Step 6: Commit**

```bash
git add prisma/ package.json package-lock.json src/actions/campaign-actions.ts .env
git commit -m "feat: add outreach follow-up fields, install Anthropic SDK, update press phases"
```

---

### Task 2: AI Prompt Templates + Outreach Actions

**Files:**
- Create: `src/lib/ai/prompts.ts`
- Create: `src/actions/outreach-actions.ts`

- [ ] **Step 1: Create prompt templates**

Create `src/lib/ai/prompts.ts`:

```typescript
export function buildPitchSystemPrompt(clientName: string, industry: string): string {
  return `You are a senior PR professional writing personalised press pitches for ${clientName}, a ${industry} brand. Your pitches are warm, professional, and tailored to each journalist's publication and beat. Write in a natural, conversational tone — not corporate or templated. Keep pitches concise (150-250 words for the body).`;
}

export function buildPitchUserPrompt(
  brief: string,
  clientName: string,
  industry: string,
  contact: { name: string; publication: string; beat: string; tier: string }
): string {
  return `Write a personalised press pitch for the following campaign and journalist.

Campaign Brief:
${brief}

Client: ${clientName} (${industry})

Journalist:
- Name: ${contact.name}
- Publication: ${contact.publication}
- Beat: ${contact.beat}
- Tier: ${contact.tier}-list

Write a subject line and email body. The subject should be compelling and specific to both the story and the publication. The body should open with a personalised hook relevant to the journalist's beat and publication, then present the key story/announcement, and close with a clear call to action.

Output format:
SUBJECT: [subject line]
BODY:
[email body]`;
}

export function buildContactSuggestionPrompt(
  brief: string,
  clientName: string,
  industry: string,
  contacts: { id: string; name: string; publication: string; beat: string; tier: string }[]
): string {
  const contactList = contacts
    .map((c) => `- ${c.name} | ${c.publication} | ${c.beat} | ${c.tier}-list | id:${c.id}`)
    .join("\n");

  return `Based on this campaign brief, suggest the most relevant journalists to pitch from the contact list below. Consider their beat, publication, and tier. Return the top 10 matches (or fewer if the list is smaller).

Campaign Brief:
${brief}

Client: ${clientName} (${industry})

Available Contacts:
${contactList}

Return a JSON array only, no other text:
[{"contactId": "the-id-value", "reason": "one line reason"}]`;
}

export function parsePitchResponse(text: string): { subject: string; body: string } {
  const subjectMatch = text.match(/SUBJECT:\s*(.+?)(?:\n|$)/);
  const bodyMatch = text.match(/BODY:\s*\n?([\s\S]+)/);

  return {
    subject: subjectMatch?.[1]?.trim() ?? "Press Pitch",
    body: bodyMatch?.[1]?.trim() ?? text,
  };
}
```

- [ ] **Step 2: Create outreach server actions**

Create `src/actions/outreach-actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveBrief(campaignId: string, brief: string) {
  try {
    await db.campaign.update({
      where: { id: campaignId },
      data: { brief },
    });
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("saveBrief error:", error);
    return { error: error instanceof Error ? error.message : "Failed to save brief" };
  }
}

export async function createOutreachDraft(
  campaignId: string,
  contactId: string,
  subject: string,
  body: string,
  generatedByAI: boolean
) {
  try {
    // Check if draft already exists for this contact+campaign
    const existing = await db.outreach.findFirst({
      where: { campaignId, contactId, followUpNumber: 0 },
    });

    if (existing) {
      // Update existing draft
      await db.outreach.update({
        where: { id: existing.id },
        data: { subject, body, generatedByAI, status: "draft" },
      });
    } else {
      await db.outreach.create({
        data: {
          campaignId,
          contactId,
          subject,
          body,
          generatedByAI,
          status: "draft",
          followUpNumber: 0,
        },
      });
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("createOutreachDraft error:", error);
    return { error: error instanceof Error ? error.message : "Failed to create draft" };
  }
}

export async function updateOutreachDraft(
  outreachId: string,
  subject: string,
  body: string
) {
  try {
    const outreach = await db.outreach.update({
      where: { id: outreachId },
      data: { subject, body },
    });
    revalidatePath(`/campaigns/${outreach.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("updateOutreachDraft error:", error);
    return { error: error instanceof Error ? error.message : "Failed to update draft" };
  }
}

export async function approveOutreach(outreachId: string) {
  try {
    const outreach = await db.outreach.update({
      where: { id: outreachId },
      data: { status: "approved" },
    });
    revalidatePath(`/campaigns/${outreach.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("approveOutreach error:", error);
    return { error: error instanceof Error ? error.message : "Failed to approve" };
  }
}

export async function bulkApproveOutreaches(campaignId: string) {
  try {
    await db.outreach.updateMany({
      where: { campaignId, status: "draft", followUpNumber: 0 },
      data: { status: "approved" },
    });
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("bulkApproveOutreaches error:", error);
    return { error: error instanceof Error ? error.message : "Failed to bulk approve" };
  }
}

export async function deleteOutreach(outreachId: string) {
  try {
    const outreach = await db.outreach.findUnique({ where: { id: outreachId } });
    if (!outreach) return { error: "Outreach not found" };
    await db.outreach.delete({ where: { id: outreachId } });
    revalidatePath(`/campaigns/${outreach.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("deleteOutreach error:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete" };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/ai/prompts.ts src/actions/outreach-actions.ts
git commit -m "feat: add AI prompt templates and outreach server actions"
```

---

### Task 3: Streaming Pitch Generation API Route

**Files:**
- Create: `src/app/api/generate-pitches/route.ts`

- [ ] **Step 1: Create the streaming API route**

Create `src/app/api/generate-pitches/route.ts`. This route:
1. Receives POST with `{ campaignId, contactIds }` as JSON body
2. Fetches campaign (with brief, client) and contacts
3. For each contact: calls Claude API, parses the response, saves as Outreach draft
4. Streams progress updates back to the client as Server-Sent Events (text/event-stream)

The route uses the Anthropic SDK directly (not streaming via Server Actions, which don't support true streaming).

Progress events format:
```
data: {"type":"generating","contactId":"...","contactName":"..."}
data: {"type":"complete","contactId":"...","subject":"...","body":"..."}
data: {"type":"error","contactId":"...","error":"..."}
data: {"type":"done","totalGenerated":5}
```

Use `@anthropic-ai/sdk` with `model: "claude-sonnet-4-20250514"` (or latest Sonnet).

Import prompts from `@/lib/ai/prompts`.

After generating each pitch, save it via a direct Prisma call (not through the server action, since we're in an API route).

Handle errors per-contact: if one fails, continue with the next and report the error in the stream.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/generate-pitches/route.ts
git commit -m "feat: add streaming pitch generation API route"
```

---

### Task 4: Contact Picker with AI Suggest

**Files:**
- Create: `src/components/campaigns/contact-picker.tsx`

- [ ] **Step 1: Create ContactPicker**

"use client" component.

Props:
```typescript
interface ContactPickerProps {
  campaignId: string;
  campaignContacts: { contactId: string; contact: { id: string; name: string; initials: string; avatarBg: string; avatarFg: string; publication: string; beat: string; tier: string } }[];
  availableContacts: { id: string; name: string; initials: string; avatarBg: string; avatarFg: string; publication: string; beat: string; tier: string }[];
  brief: string | null;
  clientName: string;
  industry: string;
}
```

Renders:
- Header: "Pitch List ({count} contacts)" + "Add contacts" button + "Suggest contacts" button (sparkle icon, only if brief exists)
- Selected contacts list: each row has Avatar (26px) + name + publication + pitch status indicator + remove button
- Pitch status: check the outreaches for each contact — "No draft" (grey), "Draft" (amber), "Approved" (green)

When "Add contacts" is clicked: show a dropdown below the button listing availableContacts. Each is clickable — calls addContactToCampaign server action.

When "Suggest contacts" is clicked:
- Call a separate API route or server action that uses Claude to suggest contacts
- For prototype simplicity: use a server action that calls the Anthropic SDK directly (non-streaming, since the response is small JSON)
- Show suggested contacts in the picker with their AI reasoning
- User clicks to add

Create a server action `suggestContacts` in outreach-actions.ts:
```typescript
export async function suggestContacts(campaignId: string) {
  // Fetch campaign, client, org contacts
  // Call Claude with buildContactSuggestionPrompt
  // Parse JSON response
  // Return { suggestions: { contactId, reason }[] }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/campaigns/contact-picker.tsx src/actions/outreach-actions.ts
git commit -m "feat: add ContactPicker with AI suggest"
```

---

### Task 5: Pitch Card Component

**Files:**
- Create: `src/components/campaigns/pitch-card.tsx`

- [ ] **Step 1: Create PitchCard**

"use client" component.

Props:
```typescript
interface PitchCardProps {
  outreach: {
    id: string;
    subject: string;
    body: string;
    status: string;
    generatedByAI: boolean;
    contact: { id: string; name: string; initials: string; avatarBg: string; avatarFg: string; publication: string };
  };
  onRegenerate: (contactId: string) => void;
}
```

Renders a card:
- Header: Avatar (26px) + contact name + publication + status Badge (draft→draft, approved→active) + AI badge if generatedByAI (sparkle icon, "AI" text)
- Subject line: editable input (13px, font-medium). On blur: save via updateOutreachDraft.
- Body: editable textarea (13px, whitespace-pre-wrap). On blur: save via updateOutreachDraft.
- Actions row: "Approve" button (primary, small) if status is "draft", "Regenerate" button (ghost, sparkle icon), "Delete" button (ghost, X icon)
- If status is "approved": show green checkmark and grey out the card slightly. Still editable (clicking reverts to draft).

Edit mode: controlled by a toggle. When not editing, show subject and body as read-only text. Click to enable editing.

Card styling: border border-custom, rounded-[10px], p-4. Approved cards get a subtle green-bg left border accent.

- [ ] **Step 2: Commit**

```bash
git add src/components/campaigns/pitch-card.tsx
git commit -m "feat: add PitchCard with inline edit and approve"
```

---

### Task 6: Draft Pitches Phase Content

**Files:**
- Create: `src/components/campaigns/phase-draft-pitches.tsx`
- Create: `src/components/campaigns/phase-outreach.tsx`
- Create: `src/components/campaigns/phase-coverage.tsx`

- [ ] **Step 1: Create DraftPitchesPhase**

"use client" component — the main functional content for the Draft Pitches phase.

Props: campaign data (id, brief, client), campaignContacts (with contact data), outreaches (drafts for this campaign), availableContacts.

Layout (top to bottom):
1. **Brief Section**: label "Campaign Brief" + textarea. Auto-save on blur (calls saveBrief action). Show save indicator ("Saved" / "Saving...").
2. **Contact Picker**: the ContactPicker component with AI suggest.
3. **Generate Button**: "Generate Pitches" (primary, sparkle icon). Disabled if no contacts or no brief. Shows count: "Generate for {n} contacts". When clicked:
   - Calls the streaming API route `/api/generate-pitches`
   - Reads the stream, shows progress per contact
   - As each pitch completes, it appears as a PitchCard
4. **Draft Review**: list of PitchCard components for all outreaches. Sorted by contact name.
5. **Bulk Actions**: if drafts exist — "Approve All" button (accent). If all approved — "All pitches approved ✓ — advance to Outreach" message with button to advance phase.

For the streaming fetch:
```typescript
const response = await fetch("/api/generate-pitches", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ campaignId, contactIds }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader!.read();
  if (done) break;
  const text = decoder.decode(value);
  // Parse SSE events, update state per contact
}
router.refresh(); // refresh server data after all done
```

- [ ] **Step 2: Create OutreachPhase placeholder**

Create `src/components/campaigns/phase-outreach.tsx` — simple placeholder:
"Connect your email account to send pitches. Coming in Phase 5B."

- [ ] **Step 3: Create CoveragePhase placeholder**

Create `src/components/campaigns/phase-coverage.tsx` — simple placeholder:
"Log coverage results for this campaign. Coming in Phase 5C."

- [ ] **Step 4: Commit**

```bash
git add src/components/campaigns/phase-*.tsx
git commit -m "feat: add DraftPitchesPhase with streaming AI generation"
```

---

### Task 7: Update Campaign Phase UI to Stepper

**Files:**
- Modify: `src/components/campaigns/campaign-phase-list.tsx` — convert to stepper with content
- Modify: `src/components/campaigns/campaign-tabs.tsx` — wire phase content

- [ ] **Step 1: Refactor campaign-phase-list into a stepper**

Read the current `campaign-phase-list.tsx` and `campaign-tabs.tsx` first.

The phase list becomes a **stepper sidebar** (on desktop) or **stepper header** (on mobile) that controls which phase content panel is shown.

For press campaigns, map phase names to content components:
- "Draft Pitches" → DraftPitchesPhase
- "Outreach" → OutreachPhase (placeholder)
- "Coverage" → CoveragePhase (placeholder)

For non-press campaigns (event, gifting): keep the existing checkbox behavior for now (functional phases for those types come later).

The component should:
- Accept a `campaignType` prop to determine whether to show functional content or checkboxes
- For press campaigns: render stepper on left (or top on mobile) + phase content on right
- Active phase is selected by default, but user can click any completed/active phase to view it
- Pending phases show "Complete previous phase first" message

- [ ] **Step 2: Update campaign-tabs to pass phase content props**

The Phases tab in campaign-tabs.tsx needs to pass all the data that DraftPitchesPhase needs (campaign, contacts, outreaches, availableContacts). Read the current props to understand what's available and what additional data needs to flow through.

This may require updating the campaign detail page to fetch and pass outreach data.

- [ ] **Step 3: Update campaign detail page to pass outreach data**

In `src/app/(app)/campaigns/[campaignId]/page.tsx`: the getCampaignById query already includes outreaches. Make sure the serialized data includes outreach records with contact info. Also pass the full campaign object (with brief, client data) through to the tabs.

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/campaigns/ src/app/\(app\)/campaigns/
git commit -m "feat: convert press campaign phases to functional stepper"
```

---

### Task 8: Standalone Outreach Screen

**Files:**
- Modify: `src/app/(app)/outreach/page.tsx`
- Create: `src/components/outreach/outreach-list-client.tsx`
- Create: `src/lib/queries/outreach-queries.ts`

- [ ] **Step 1: Create outreach queries**

Create `src/lib/queries/outreach-queries.ts`:

```typescript
import { db } from "@/lib/db";

export async function getAllOutreaches(organizationId: string) {
  return db.outreach.findMany({
    where: { campaign: { organizationId } },
    include: {
      contact: {
        select: { id: true, name: true, initials: true, avatarBg: true, avatarFg: true, publication: true },
      },
      campaign: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true, initials: true, colour: true, bgColour: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 2: Create OutreachListClient**

Create `src/components/outreach/outreach-list-client.tsx` — "use client" component.

An aggregate view of all outreaches across all campaigns. Shows:
- StatsBar: Total drafts, Approved, Sent (0 for now), Replied (0 for now)
- FilterPills: status filter (All / Draft / Approved / Sent / Replied)
- List of outreach cards: contact Avatar + name + publication + campaign name (with client badge) + subject line preview + status Badge
- Each card links to the campaign detail page (not a separate outreach detail)

Wrapped in `p-4 md:p-6`.

- [ ] **Step 3: Build server page**

Replace `src/app/(app)/outreach/page.tsx`:
- `export const dynamic = "force-dynamic"`
- Fetch all outreaches for the org
- Serialize dates
- Render OutreachListClient

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries/outreach-queries.ts src/components/outreach/ src/app/\(app\)/outreach/page.tsx
git commit -m "feat: build standalone Outreach aggregate screen"
```

---

### Task 9: Final Verification + Push

- [ ] **Step 1: Build check**

Run: `npm run build`

- [ ] **Step 2: Dev server test**

Test:
1. Create a new press campaign → 3 phases (Draft Pitches, Outreach, Coverage)
2. Write a brief in the Draft Pitches phase
3. Add contacts to the pitch list
4. Click "Suggest contacts" (requires ANTHROPIC_API_KEY in env)
5. Click "Generate Pitches" → watch streaming generation
6. Review drafts: edit subject/body, approve individual
7. Bulk approve all
8. Outreach and Coverage phases show placeholders
9. `/outreach` standalone screen shows all drafts
10. Dark mode + mobile responsive

- [ ] **Step 3: Push**

```bash
git push origin main
```

---

## Phase 5A Completion Checklist

- [ ] Outreach model extended with follow-up fields (migration applied)
- [ ] @anthropic-ai/sdk installed
- [ ] Press campaign phases updated to 3 (Draft Pitches, Outreach, Coverage)
- [ ] AI prompt templates (pitch generation + contact suggestion)
- [ ] Outreach server actions (create/update/approve/bulk-approve/delete drafts, save brief, suggest contacts)
- [ ] Streaming pitch generation API route
- [ ] ContactPicker with AI suggest
- [ ] PitchCard with inline edit and approve
- [ ] DraftPitchesPhase with brief editor + contact picker + generate + review
- [ ] Campaign phase list converted to functional stepper (press) / checkboxes (others)
- [ ] Standalone /outreach aggregate view
- [ ] Outreach/Coverage phases show placeholders for 5B/5C
- [ ] Light/dark mode, mobile responsive
- [ ] Deployed on Vercel (requires ANTHROPIC_API_KEY env var)
