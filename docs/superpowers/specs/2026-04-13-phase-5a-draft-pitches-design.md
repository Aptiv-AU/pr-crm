# Phase 5A: Draft Pitches & AI — Design Specification

## Context

Press campaigns are the most common campaign type for NWPR. The current campaign phase system uses status checkboxes with no functional content. This phase converts the press campaign workflow into functional stages, starting with AI-powered pitch drafting.

The press campaign phases are simplified from 5 to 3:
1. **Draft Pitches** — brief, contact selection, AI generation, review/approve
2. **Outreach** — sending and tracking (Phase 5B)
3. **Coverage** — logging results (Phase 5C)

This spec covers Phase 5A only: the Draft Pitches functionality and the AI pitch generation integration.

## What Changes

### Campaign Phase Templates (press campaigns only)
Update press campaign phases from 5 to 3:
- Old: Research → Draft Pitches → Outreach → Follow-up → Coverage Tracking
- New: Draft Pitches → Outreach → Coverage

Existing press campaigns keep their current phases. New press campaigns get the updated 3-phase template.

### Phase UI Model
Phases change from a checkbox list to a **stepper with expandable content panels**. Each phase has:
- A status indicator in the left stepper (pending/active/complete)
- A content area that shows the functional UI for that phase
- A summary line when collapsed (e.g., "8 pitches drafted, 6 approved")

The active phase is expanded by default. Users can click any phase to view its content (completed phases are read-only, pending phases show a "not yet available" message).

### Campaign Brief
The campaign brief field already exists (`Campaign.brief: String?`). The Draft Pitches phase surfaces this as an editable text area at the top of the phase content. The brief is the core input for AI pitch generation.

---

## Draft Pitches Phase — Functional Spec

When a press campaign's "Draft Pitches" phase is active (or selected), the phase content area shows:

### Section 1: Campaign Brief
- Editable textarea (auto-saves on blur or after 2 seconds of inactivity)
- Label: "Campaign Brief"
- Placeholder: "Describe the story angle, key messages, assets, and target publications..."
- Saves to `Campaign.brief` via server action

### Section 2: Contact Selection
- Header: "Pitch List" with count (e.g., "Pitch List (8 contacts)")
- "Add contacts" button → opens a dropdown/panel showing all org contacts not yet in this campaign
- Optional "Suggest contacts" button → calls Claude API to recommend contacts based on the brief content and their beats/publications. Returns a ranked list with reasoning.
- Selected contacts appear as a list: Avatar + name + publication + tier Badge + remove (X) button
- Each contact also shows their pitch status: "No draft" / "Draft" / "Approved"

### Section 3: Generate Pitches
- "Generate Pitches" button (primary, with sparkle icon) — disabled if no contacts selected or no brief written
- Generates one unique pitch per selected contact using Claude API
- Shows streaming progress (generating for "Anya Kessler"... then "Marcus Mills"...)
- Can regenerate individual pitches or all at once

### Section 4: Draft Review
- List of generated pitches, one card per contact
- Each card shows:
  - Contact: Avatar + name + publication
  - Subject line (editable inline)
  - Email body (editable textarea, preserving formatting)
  - Status Badge: Draft / Approved
  - Actions: "Approve" (marks as approved), "Regenerate" (re-calls Claude for this contact), "Edit" (toggles edit mode)
- Bulk "Approve All" button when all drafts are reviewed
- When all pitches are approved, show a "Ready to send — advance to Outreach" prompt

---

## AI Prompt Architecture

### System Prompt
```
You are a senior PR professional writing personalised press pitches for {client.name}, a {client.industry} brand. Your pitches are warm, professional, and tailored to each journalist's publication and beat. Write in a natural, conversational tone — not corporate or templated. Keep pitches concise (150-250 words for the body).
```

### User Prompt (per contact)
```
Write a personalised press pitch for the following campaign and journalist.

Campaign Brief:
{campaign.brief}

Client: {client.name} ({client.industry})

Journalist:
- Name: {contact.name}
- Publication: {contact.publication}
- Beat: {contact.beat}
- Tier: {contact.tier}

Write a subject line and email body. The subject should be compelling and specific to both the story and the publication. The body should open with a personalised hook relevant to the journalist's beat and publication, then present the key story/announcement, and close with a clear call to action.

Output format:
SUBJECT: [subject line]
BODY:
[email body]
```

### Model & Parameters
- Model: Claude Sonnet (fast, cost-effective for batch generation)
- Streaming: yes (show progress per contact)
- Temperature: 0.7 (creative but not wild)

### Contact Suggestion Prompt
When "Suggest contacts" is clicked:
```
Based on this campaign brief, suggest the most relevant journalists to pitch from the contact list below. Consider their beat, publication, and tier. Return the top 10 matches with a one-line reason for each.

Campaign Brief:
{campaign.brief}

Client: {client.name} ({client.industry})

Available Contacts:
{contacts.map(c => `- ${c.name} (${c.publication}, ${c.beat}, ${c.tier}-list)`).join('\n')}

Output format (JSON):
[{ "contactId": "...", "reason": "..." }, ...]
```

---

## Data Model Changes

### Outreach model — add fields
```prisma
model Outreach {
  // existing fields...
  followUpNumber  Int       @default(0)     // 0=initial, 1=first follow-up, 2=second
  scheduledAt     DateTime?                  // when follow-up is scheduled (Phase 5B)
  sentVia         String?                    // "microsoft_graph" (Phase 5B)
  messageId       String?                    // Outlook message ID (Phase 5B)
  conversationId  String?                    // Outlook conversation ID (Phase 5B)
}
```

Note: `sentVia`, `messageId`, `conversationId` are for Phase 5B. Adding them now avoids a migration later.

### Phase template update
```typescript
const PHASE_TEMPLATES: Record<string, string[]> = {
  press: ["Draft Pitches", "Outreach", "Coverage"],  // updated from 5 to 3
  event: ["Planning", "Invite List", "Send Invitations", "Track RSVPs", "Logistics & Runsheet", "Post-event Follow-up"],
  gifting: ["Select Products", "Build Send List", "Ship & Track", "Follow-up", "Coverage Tracking"],
};
```

---

## UI Components

### Updated CampaignTabs
Replace the current tab-based layout with a stepper-based layout for the Phases tab. Other tabs (Contacts, Suppliers, Budget) remain unchanged.

The Phases tab becomes the default/primary view showing the stepper on the left and phase content on the right (desktop) or stacked (mobile).

### New Components
- `PhaseStepperSidebar` — vertical stepper with status indicators and phase selection
- `DraftPitchesPhase` — the Draft Pitches phase content (brief, contacts, generate, review)
- `PitchCard` — individual pitch draft card with edit/approve/regenerate
- `ContactPicker` — dropdown for adding contacts to campaign with optional AI suggest
- `OutreachPhase` — placeholder "Connect email to send pitches" (Phase 5B)
- `CoveragePhase` — placeholder "Log coverage for this campaign" (Phase 5C)

### Standalone /outreach Screen
The `/outreach` nav item becomes an aggregate view showing all draft/approved/sent pitches across all campaigns. Filterable by campaign and status. This is a read-only dashboard — actual pitch management happens within each campaign's phase view.

---

## API Integration

### Claude API
- Package: `@anthropic-ai/sdk`
- Server-side only (API key in env vars)
- Streaming via Server Actions with `streamUI` or a custom streaming endpoint
- For pitch generation: iterate over selected contacts, generate one at a time, stream each to the client
- API key env var: `ANTHROPIC_API_KEY`

### Route for streaming
Create `src/app/api/generate-pitches/route.ts` — a streaming API route that:
1. Receives: campaignId, contactIds[]
2. Fetches campaign brief + contact profiles
3. For each contact: calls Claude API, streams the response
4. Saves completed pitches as Outreach records (status: "draft")
5. Returns streamed progress updates to the client

---

## Verification

1. Create a new press campaign → 3 phases appear (Draft Pitches, Outreach, Coverage)
2. Write a brief, add contacts, click "Generate Pitches"
3. Watch streaming generation per contact
4. Review drafts: edit subject/body, approve individual or bulk approve
5. Regenerate a single pitch — new content appears
6. "Suggest contacts" returns relevant matches based on brief
7. Outreach and Coverage phases show placeholder content
8. `/outreach` standalone screen shows all drafts across campaigns
9. Dark mode works
10. Mobile responsive
