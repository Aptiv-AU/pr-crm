# Phase 5B: Email Integration (Microsoft Outlook) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable sending approved pitches directly via the user's Outlook email (Microsoft Graph API), with reply detection and automated follow-up draft generation via a 15-minute cron job.

**Architecture:** OAuth flow via Microsoft Entra connects the user's Outlook account, storing tokens in an EmailAccount model. Approved pitches are sent via Microsoft Graph `sendMail` endpoint from the user's real email address. A Vercel cron job runs every 15 minutes to check for replies (via Graph conversation search) and auto-generate follow-up drafts for non-responders after 3 and 7 days.

**Tech Stack:** Microsoft Graph API (REST — no SDK needed, just fetch), NextAuth for OAuth, Vercel Cron, Prisma

---

## Azure App Registration (user setup — not code)

Before the integration works, the user needs to register an app in Microsoft Entra:
1. Go to portal.azure.com → Microsoft Entra ID → App registrations → New
2. Name: "Pressroom CRM"
3. Redirect URI: `https://pr-crm.vercel.app/api/auth/callback/microsoft` (Web)
4. API permissions: `Mail.Send`, `Mail.Read`, `User.Read` (delegated)
5. Create a client secret
6. Set env vars: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── email/
│   │   │   ├── connect/route.ts          # Start Microsoft OAuth flow
│   │   │   ├── callback/route.ts         # Handle OAuth callback, store tokens
│   │   │   └── disconnect/route.ts       # Remove email account
│   │   └── cron/
│   │       └── check-replies/route.ts    # Cron endpoint: detect replies + generate follow-ups
│   └── (app)/settings/page.tsx           # Update: pass email account data
├── actions/
│   └── outreach-actions.ts               # Update: add sendOutreach, sendBulk, markAsSent
├── lib/
│   └── email/
│       ├── microsoft-graph.ts            # Graph API helpers: sendMail, searchReplies, refreshToken
│       └── follow-up.ts                  # Follow-up logic: check overdue, generate drafts
├── components/
│   ├── settings/
│   │   └── settings-client.tsx           # Update: add Email Account section
│   └── campaigns/
│       ├── phase-outreach.tsx            # Replace: functional outreach phase content
│       └── outreach-send-card.tsx        # Individual outreach with send/status UI
prisma/
│   └── schema.prisma                     # Add EmailAccount model
vercel.json                               # Cron schedule config
```

---

### Task 1: Schema + EmailAccount Model

**Files:**
- Modify: `prisma/schema.prisma` — add EmailAccount model
- Create: `vercel.json` — cron config

- [ ] **Step 1: Add EmailAccount model**

Add to `prisma/schema.prisma`:
```prisma
model EmailAccount {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  provider      String    @default("microsoft")
  email         String
  accessToken   String
  refreshToken  String
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

Also add the relation to the User model:
```prisma
// In User model, add:
  emailAccounts  EmailAccount[]
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-email-account
```

- [ ] **Step 3: Create vercel.json for cron**

Create `vercel.json` in the project root:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-replies",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

This runs the reply-check endpoint every 15 minutes.

- [ ] **Step 4: Add env var placeholders**

Add to `.env`:
```
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_TENANT_ID=""
CRON_SECRET=""
```

`CRON_SECRET` is used to verify that cron requests come from Vercel (not external callers).

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add EmailAccount model and cron config"
```

---

### Task 2: Microsoft Graph API Helpers

**Files:**
- Create: `src/lib/email/microsoft-graph.ts`

- [ ] **Step 1: Create Graph API helper**

This module wraps Microsoft Graph REST API calls. No SDK needed — just fetch.

Functions:

**getAuthUrl(state)**: Builds the Microsoft OAuth authorization URL. Uses `MICROSOFT_CLIENT_ID`, `MICROSOFT_TENANT_ID`. Scopes: `openid email profile offline_access Mail.Send Mail.Read User.Read`. Redirect URI: `${process.env.NEXTAUTH_URL || process.env.VERCEL_URL}/api/email/callback`.

**exchangeCodeForTokens(code)**: POST to Microsoft token endpoint. Exchanges auth code for access_token, refresh_token, expires_in. Returns `{ accessToken, refreshToken, expiresAt, email }`. Calls `/me` to get the user's email address.

**refreshAccessToken(refreshToken)**: POST to Microsoft token endpoint with `grant_type=refresh_token`. Returns new `{ accessToken, refreshToken, expiresAt }`.

**sendMail(accessToken, { to, subject, body, replyTo? })**: POST to `https://graph.microsoft.com/v1.0/me/sendMail`. Body is HTML. Returns the sent message ID from the response headers (or fetches from sent items).

**getConversationReplies(accessToken, conversationId)**: GET `https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '${conversationId}'&$orderby=receivedDateTime desc&$top=5`. Returns messages in the conversation.

**getSentMessage(accessToken, messageId)**: GET `https://graph.microsoft.com/v1.0/me/messages/${messageId}`. Returns message details including conversationId.

All functions handle token refresh automatically — accept the EmailAccount, check if expired, refresh if needed, update the DB, then make the call.

Create a helper `getValidToken(emailAccount)` that checks expiry and refreshes automatically:
```typescript
async function getValidToken(emailAccountId: string): Promise<string> {
  const account = await db.emailAccount.findUnique({ where: { id: emailAccountId } });
  if (!account) throw new Error("Email account not found");
  
  if (account.expiresAt > new Date()) {
    return account.accessToken;
  }
  
  // Token expired, refresh
  const tokens = await refreshAccessToken(account.refreshToken);
  await db.emailAccount.update({
    where: { id: emailAccountId },
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    },
  });
  return tokens.accessToken;
}
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add Microsoft Graph API helpers"
```

---

### Task 3: OAuth Flow (Connect/Callback/Disconnect)

**Files:**
- Create: `src/app/api/email/connect/route.ts`
- Create: `src/app/api/email/callback/route.ts`
- Create: `src/app/api/email/disconnect/route.ts`

- [ ] **Step 1: Connect route**

GET `/api/email/connect`: generates the Microsoft OAuth URL and redirects the user to Microsoft login. Stores a random `state` parameter in a cookie for CSRF protection.

- [ ] **Step 2: Callback route**

GET `/api/email/callback`: Microsoft redirects here after user authorizes. Verifies `state` matches cookie. Exchanges `code` for tokens. Creates or updates an EmailAccount record (look up the first user in the org, since we don't have multi-user auth yet). Redirects to `/settings` with a success message.

- [ ] **Step 3: Disconnect route**

POST `/api/email/disconnect`: deletes the EmailAccount record. Revalidates `/settings`. Returns redirect to `/settings`.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add Microsoft OAuth connect/callback/disconnect routes"
```

---

### Task 4: Send Outreach Actions

**Files:**
- Modify: `src/actions/outreach-actions.ts` — add send functions

- [ ] **Step 1: Add send functions**

**sendOutreach(outreachId)**: 
1. Fetch the outreach with contact (email required) and campaign
2. Find the org's email account (first EmailAccount)
3. If no email account: return error "Connect your email in Settings first"
4. If contact has no email: return error "Contact has no email address"
5. Get valid access token (auto-refresh)
6. Call sendMail with: to=contact.email, subject=outreach.subject, body=outreach.body (convert to HTML — wrap paragraphs in `<p>` tags)
7. Get the sent message's conversationId
8. Update outreach: status="sent", sentAt=now, sentVia="microsoft_graph", messageId, conversationId
9. Create an Interaction record: type="email_sent", contactId, campaignId, date=now, summary=subject
10. Revalidate paths
11. Return { success: true }

**sendBulkOutreach(campaignId)**: sends all approved outreaches for a campaign, one by one with a small delay. Returns count of sent/failed.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add outreach send actions via Microsoft Graph"
```

---

### Task 5: Follow-up Logic + Cron

**Files:**
- Create: `src/lib/email/follow-up.ts`
- Create: `src/app/api/cron/check-replies/route.ts`

- [ ] **Step 1: Create follow-up logic**

`src/lib/email/follow-up.ts`:

**checkForReplies(organizationId)**: 
1. Find all outreaches with status="sent" and a conversationId
2. Get the org's email account + valid token
3. For each outreach: call getConversationReplies, check if there are messages after the sent date that aren't from the sender
4. If reply found: update outreach status to "replied", create Interaction record (type="reply_received")
5. Return count of new replies detected

**generateFollowUps(organizationId)**:
1. Find outreaches where status="sent", followUpNumber < 2, no reply, sentAt > X days ago
   - followUpNumber=0 and sentAt > 3 days ago → needs first follow-up
   - followUpNumber=1 and sentAt > 7 days ago → needs second follow-up
2. For each: generate a follow-up draft using the AI provider
   - System prompt: "Write a brief, friendly follow-up to a press pitch..."
   - User prompt: include original subject and first 200 chars of original body
3. Create new Outreach record: followUpNumber=prev+1, status="pending_approval", scheduledAt=now, generatedByAI=true
4. Return count of follow-ups generated

- [ ] **Step 2: Create cron endpoint**

`src/app/api/cron/check-replies/route.ts`:

GET endpoint:
1. Verify request comes from Vercel cron (check `Authorization: Bearer ${CRON_SECRET}` header)
2. Find all orgs with at least one EmailAccount
3. For each org: call checkForReplies, then generateFollowUps
4. Return { repliesFound, followUpsGenerated }

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add reply detection and follow-up generation cron"
```

---

### Task 6: Outreach Send UI

**Files:**
- Create: `src/components/campaigns/outreach-send-card.tsx`
- Modify: `src/components/campaigns/phase-outreach.tsx` — replace placeholder

- [ ] **Step 1: Create OutreachSendCard**

"use client". Props: outreach (with contact, status, sentAt, followUpNumber), emailConnected (boolean).

For approved outreaches (not yet sent):
- Contact avatar + name + email + subject preview
- "Send" button (primary) — calls sendOutreach, shows sending state
- If no email on contact: disabled with "No email" tooltip

For sent outreaches:
- Same contact info + "Sent" badge (green) + sent date
- Status: "Awaiting reply" or "Replied" based on status
- If replied: "Replied" badge (green)

For follow-up drafts (status "pending_approval"):
- Shows "Follow-up #{n}" label
- Subject + body preview (editable)
- "Approve & Send" button or "Edit" + "Approve" + "Send" buttons

- [ ] **Step 2: Replace phase-outreach.tsx**

Replace the placeholder with functional content.

Props: campaignId, outreaches (all for this campaign, including follow-ups), emailConnected.

Renders:
- If not email connected: prominent "Connect Email" card with link to `/settings` and explanation
- If connected: 
  - Summary stats: Approved (ready to send), Sent, Awaiting reply, Replied
  - "Send All Approved" button (primary) — calls sendBulkOutreach
  - Section: "Ready to Send" — list of approved outreaches with send buttons
  - Section: "Sent" — list of sent outreaches with status
  - Section: "Follow-ups" — list of pending follow-up drafts to approve
  - Section: "Replied" — list of replied outreaches

- [ ] **Step 3: Update campaign-tabs to pass emailConnected prop**

Read current campaign-tabs.tsx. The Outreach tab currently renders DraftPitchesPhase. It should render DraftPitchesPhase for the draft/approve workflow AND OutreachPhase for the send/track workflow.

Option: make the Outreach tab show both sections — drafting at top, sending below. Or keep them as sub-tabs. Simplest: show DraftPitchesPhase content first (brief, contacts, generate, review), then a divider, then OutreachPhase content (send, track).

To know if email is connected: the campaign detail server page needs to check if any EmailAccount exists for the org. Pass `emailConnected: boolean` through.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: add outreach send UI with send/track status"
```

---

### Task 7: Settings — Email Account Management

**Files:**
- Modify: `src/components/settings/settings-client.tsx` — add Email section
- Modify: `src/app/(app)/settings/page.tsx` — pass email account data

- [ ] **Step 1: Update settings page to pass email data**

In the server page, check for connected email accounts:
```typescript
const emailAccount = await db.emailAccount.findFirst({
  where: { user: { organization: { id: org.id } } },
  select: { id: true, email: true, provider: true, createdAt: true },
});
```

Pass `emailAccount` to SettingsClient.

- [ ] **Step 2: Add Email section to settings UI**

Add a new Card section between AI Provider and Organization:

**Email Account**:
- Title: "Email Account" (16px bold)
- Description: "Connect your Outlook account to send pitches directly"
- If not connected: "Connect Outlook" button (primary) — links to `/api/email/connect`
- If connected: show email address, connected date, "Disconnect" button (ghost, red)
- Note text: "Requires Microsoft 365 / Outlook. Pitches will be sent from your email address."

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: add Email Account management in Settings"
```

---

### Task 8: Final Verification + Push

- [ ] **Step 1: Build check**

Run: `npm run build`

- [ ] **Step 2: Push**

```bash
git push origin main
```

---

## Env Vars Needed (Vercel Dashboard)

- `MICROSOFT_CLIENT_ID` — from Azure app registration
- `MICROSOFT_CLIENT_SECRET` — from Azure app registration  
- `MICROSOFT_TENANT_ID` — from Azure (use "common" for multi-tenant or specific tenant ID)
- `CRON_SECRET` — generate with `openssl rand -base64 32`, used to verify cron requests

## Phase 5B Completion Checklist

- [ ] EmailAccount model + migration
- [ ] Microsoft Graph API helpers (auth URL, token exchange, refresh, sendMail, search replies)
- [ ] OAuth connect/callback/disconnect routes
- [ ] Send outreach action (single + bulk) via Graph API
- [ ] Reply detection logic
- [ ] Follow-up draft auto-generation (3-day + 7-day)
- [ ] Cron endpoint for reply checking (every 15 min)
- [ ] OutreachSendCard with send/status/follow-up UI
- [ ] Outreach phase content (replaces placeholder)
- [ ] Email Account section in Settings (connect/disconnect)
- [ ] vercel.json cron config
- [ ] Light/dark mode, mobile responsive
- [ ] Deployed (requires Azure app registration + env vars to test)
