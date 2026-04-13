# Phase 1: Workspaces — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Workspaces screens — all-clients overview, individual client workspace, workspace switcher, and add/edit client slide-over — wired to Neon Postgres so the first real user can start entering clients.

**Architecture:** Server Components for pages with data fetching via Prisma. Server Actions for mutations. Client Components only where interactivity is needed (slide-over, workspace switcher, tabs). Shared SlideOverPanel component for all future data entry forms.

**Tech Stack:** Next.js App Router, Prisma, Server Actions, React Server Components

**Design Spec:** `docs/superpowers/specs/2026-04-12-pressroom-crm-design.md`
**Mockup Reference:** `pressroom_v7.jsx` (repo root at `/Users/scott/Developer/pr-crm/`)

---

## CSS Variable Reference (suffixed names)

All components MUST use these exact variable names:
- `var(--page-bg)`, `var(--card-bg)`, `var(--sidebar-bg)` — no suffix
- `var(--border-custom)` — NOT `var(--border)`
- `var(--border-mid)` — no suffix
- `var(--text-primary)` — NOT `var(--text)`
- `var(--text-sub)` — no suffix
- `var(--text-muted-custom)` — NOT `var(--text-muted)`
- `var(--accent-custom)` — NOT `var(--accent)`
- `var(--accent-bg)`, `var(--accent-border)`, `var(--accent-text)` — no suffix
- `var(--hover-bg)`, `var(--active-bg)` — no suffix
- `var(--green)`, `var(--green-bg)`, `var(--green-border)` — no suffix
- `var(--amber)`, `var(--amber-bg)`, `var(--amber-border)` — no suffix
- `var(--slate-custom)`, `var(--slate-bg)`, `var(--slate-border)` — slate-custom for text color
- `var(--overlay)` — no suffix

## Existing Component API Reference

```typescript
// Badge: variant = "default"|"active"|"outreach"|"draft"|"warm"|"cool"|"solid"|"accent"
<Badge variant="active">Active</Badge>

// Button: variant = "primary"|"default"|"ghost", size = "xs"|"sm"|"md", icon = IconName
<Button variant="primary" size="md" icon="plus">New campaign</Button>

// Card: wrapper with border + rounded corners
<Card className="p-4">content</Card>

// Avatar: circular initials
<Avatar initials="LP" bg="#FEF3C7" fg="#92400E" size={38} />

// Icon: 23 named SVG icons
<Icon name="chevronR" size={14} color="var(--text-muted-custom)" />

// Divider: 1px horizontal line
<Divider />
```

## File Structure

```
src/
├── actions/
│   └── client-actions.ts           # Server Actions: createClient, updateClient
├── components/
│   ├── shared/
│   │   └── slide-over-panel.tsx     # Reusable slide-over panel (right side)
│   └── workspaces/
│       ├── client-card.tsx          # Single client card for overview grid
│       ├── client-form.tsx          # Add/edit client form (inside slide-over)
│       ├── client-hero.tsx          # Client workspace hero section
│       ├── client-stats.tsx         # 4-col stats strip (reused in overview + workspace)
│       ├── campaign-card.tsx        # Campaign card for workspace campaigns tab
│       ├── workspace-tabs.tsx       # Tab navigation + content for client workspace
│       └── workspace-switcher.tsx   # Functional dropdown (replaces placeholder)
├── lib/
│   └── queries/
│       └── client-queries.ts        # Prisma queries for clients + related stats
├── app/(app)/
│   ├── workspaces/
│   │   ├── page.tsx                 # AllClientsScreen (Server Component)
│   │   └── [clientId]/
│   │       └── page.tsx             # ClientWorkspaceScreen (Server Component)
```

---

### Task 1: Client Queries

**Files:**
- Create: `src/lib/queries/client-queries.ts`

- [ ] **Step 1: Create the queries file**

Create `src/lib/queries/client-queries.ts`:
```typescript
import { db } from "@/lib/db";

export async function getClients(organizationId: string) {
  return db.client.findMany({
    where: { organizationId },
    include: {
      campaigns: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        },
      },
      _count: {
        select: {
          campaigns: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClientById(clientId: string) {
  return db.client.findUnique({
    where: { id: clientId },
    include: {
      campaigns: {
        include: {
          campaignContacts: true,
          outreaches: true,
          coverages: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getOrganizationStats(organizationId: string) {
  const [clientCount, contactCount, campaignCount, coverageAgg] = await Promise.all([
    db.client.count({ where: { organizationId } }),
    db.contact.count({ where: { organizationId } }),
    db.campaign.count({ where: { organizationId, status: { not: "complete" } } }),
    db.coverage.aggregate({
      where: { organizationId },
      _sum: { mediaValue: true },
    }),
  ]);

  return {
    clientCount,
    contactCount,
    campaignCount,
    mediaValue: coverageAgg._sum.mediaValue?.toNumber() ?? 0,
  };
}

export async function getClientStats(clientId: string) {
  const [contactCount, campaignCount, coverageCount, outreachStats] = await Promise.all([
    db.campaignContact.count({
      where: { campaign: { clientId } },
    }),
    db.campaign.count({ where: { clientId } }),
    db.coverage.count({ where: { campaign: { clientId } } }),
    db.outreach.groupBy({
      by: ["status"],
      where: { campaign: { clientId } },
      _count: true,
    }),
  ]);

  const totalOutreach = outreachStats.reduce((sum, s) => sum + s._count, 0);
  const replied = outreachStats.find((s) => s.status === "replied")?._count ?? 0;
  const replyRate = totalOutreach > 0 ? Math.round((replied / totalOutreach) * 100) : 0;

  return {
    contactCount,
    campaignCount,
    coverageCount,
    replyRate,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/queries/client-queries.ts
git commit -m "feat: add client query functions"
```

---

### Task 2: Server Actions for Client CRUD

**Files:**
- Create: `src/actions/client-actions.ts`

- [ ] **Step 1: Create server actions**

Create `src/actions/client-actions.ts`:
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

// Temporary: hardcoded org ID until auth is wired up.
// In Phase 0 we set up NextAuth but haven't created an org yet.
// This will be replaced with session-based org lookup.
async function getOrganizationId(): Promise<string> {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({
      data: {
        name: "NWPR",
        currency: "AUD",
      },
    });
  }
  return org.id;
}

export async function createClient(formData: FormData) {
  const orgId = await getOrganizationId();

  const name = formData.get("name") as string;
  const industry = formData.get("industry") as string;
  const colour = formData.get("colour") as string;
  const bgColour = formData.get("bgColour") as string;
  const initials = formData.get("initials") as string;

  if (!name || !industry || !colour || !bgColour || !initials) {
    return { error: "All fields are required" };
  }

  const client = await db.client.create({
    data: {
      organizationId: orgId,
      name,
      industry,
      colour,
      bgColour,
      initials: initials.toUpperCase().slice(0, 2),
    },
  });

  revalidatePath("/workspaces");
  return { success: true, clientId: client.id };
}

export async function updateClient(clientId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const industry = formData.get("industry") as string;
  const colour = formData.get("colour") as string;
  const bgColour = formData.get("bgColour") as string;
  const initials = formData.get("initials") as string;

  if (!name || !industry || !colour || !bgColour || !initials) {
    return { error: "All fields are required" };
  }

  await db.client.update({
    where: { id: clientId },
    data: {
      name,
      industry,
      colour,
      bgColour,
      initials: initials.toUpperCase().slice(0, 2),
    },
  });

  revalidatePath("/workspaces");
  revalidatePath(`/workspaces/${clientId}`);
  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/actions/client-actions.ts
git commit -m "feat: add client create/update server actions"
```

---

### Task 3: Slide-Over Panel (Shared Component)

**Files:**
- Create: `src/components/shared/slide-over-panel.tsx`

- [ ] **Step 1: Create the slide-over panel**

Create `src/components/shared/slide-over-panel.tsx`:
```typescript
"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function SlideOverPanel({ open, onClose, title, children }: SlideOverPanelProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "var(--overlay)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-[101] flex h-full w-full flex-col transition-transform duration-[240ms] ease-[cubic-bezier(0.32,0,0.15,1)] md:w-[400px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          background: "var(--card-bg)",
          borderLeft: "1px solid var(--border-custom)",
          boxShadow: open ? "-4px 0 24px rgba(0,0,0,0.08)" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border-custom)" }}
        >
          <h2
            className="text-[15px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--text-sub)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ WebkitOverflowScrolling: "touch" as unknown as string }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/slide-over-panel.tsx
git commit -m "feat: add SlideOverPanel shared component"
```

---

### Task 4: Client Form Component

**Files:**
- Create: `src/components/workspaces/client-form.tsx`

- [ ] **Step 1: Create the client form**

Create `src/components/workspaces/client-form.tsx`. This form is used inside the SlideOverPanel for both creating and editing clients.

```typescript
"use client";

import { useTransition, useState, useEffect } from "react";
import { createClient, updateClient } from "@/actions/client-actions";
import { Button } from "@/components/ui/button";

// Preset color pairs for client branding
const COLOR_PRESETS = [
  { colour: "#92400E", bgColour: "#FEF3C7", label: "Amber" },
  { colour: "#166534", bgColour: "#DCFCE7", label: "Green" },
  { colour: "#1E40AF", bgColour: "#DBEAFE", label: "Blue" },
  { colour: "#7E22CE", bgColour: "#FDF4FF", label: "Purple" },
  { colour: "#9D174D", bgColour: "#FCE7F3", label: "Pink" },
  { colour: "#0F766E", bgColour: "#CCFBF1", label: "Teal" },
  { colour: "#C2410C", bgColour: "#FFEDD5", label: "Orange" },
  { colour: "#4338CA", bgColour: "#E0E7FF", label: "Indigo" },
];

interface ClientFormProps {
  client?: {
    id: string;
    name: string;
    industry: string;
    colour: string;
    bgColour: string;
    initials: string;
  } | null;
  onSuccess: () => void;
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(client?.name ?? "");
  const [industry, setIndustry] = useState(client?.industry ?? "");
  const [selectedColor, setSelectedColor] = useState(
    COLOR_PRESETS.findIndex((p) => p.colour === client?.colour) >= 0
      ? COLOR_PRESETS.findIndex((p) => p.colour === client?.colour)
      : 0
  );
  const [initials, setInitials] = useState(client?.initials ?? "");

  // Auto-generate initials from name
  useEffect(() => {
    if (!client && name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        setInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase());
      } else if (parts.length === 1 && parts[0].length >= 2) {
        setInitials(parts[0].slice(0, 2).toUpperCase());
      }
    }
  }, [name, client]);

  const handleSubmit = () => {
    setError(null);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("industry", industry);
    formData.set("colour", COLOR_PRESETS[selectedColor].colour);
    formData.set("bgColour", COLOR_PRESETS[selectedColor].bgColour);
    formData.set("initials", initials);

    startTransition(async () => {
      const result = client
        ? await updateClient(client.id, formData)
        : await createClient(formData);

      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  };

  const inputStyle = {
    background: "var(--card-bg)",
    border: "1px solid var(--border-custom)",
    color: "var(--text-primary)",
  };

  const labelStyle = {
    color: "var(--text-muted-custom)",
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          className="rounded-lg px-3 py-2 text-[12px] font-medium"
          style={{ background: "var(--amber-bg)", color: "var(--amber)", border: "1px solid var(--amber-border)" }}
        >
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em]" style={labelStyle}>
          Client name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Lumière Paris"
          className="w-full rounded-lg px-3 py-2 text-[13px] focus:outline-none"
          style={inputStyle}
        />
      </div>

      {/* Industry */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em]" style={labelStyle}>
          Industry
        </label>
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g., Fashion, Skincare, Beauty"
          className="w-full rounded-lg px-3 py-2 text-[13px] focus:outline-none"
          style={inputStyle}
        />
      </div>

      {/* Initials */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em]" style={labelStyle}>
          Initials (2 characters)
        </label>
        <input
          type="text"
          value={initials}
          onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          placeholder="LP"
          className="w-full rounded-lg px-3 py-2 text-[13px] uppercase focus:outline-none"
          style={{ ...inputStyle, width: 80 }}
        />
      </div>

      {/* Color preset picker */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em]" style={labelStyle}>
          Brand colour
        </label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSelectedColor(i)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
              style={{
                background: preset.bgColour,
                border: selectedColor === i
                  ? `2px solid ${preset.colour}`
                  : "2px solid transparent",
                outline: selectedColor === i ? `2px solid ${preset.colour}` : "none",
                outlineOffset: 1,
              }}
            >
              <div
                className="h-3 w-3 rounded-full"
                style={{ background: preset.colour }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.05em]" style={labelStyle}>
          Preview
        </label>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-[9px] text-[13px] font-bold"
            style={{
              width: 38,
              height: 38,
              background: COLOR_PRESETS[selectedColor].bgColour,
              color: COLOR_PRESETS[selectedColor].colour,
            }}
          >
            {initials || "??"}
          </div>
          <div>
            <div className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>
              {name || "Client name"}
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-muted-custom)" }}>
              {industry || "Industry"}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="mt-2 flex gap-2 justify-end"
        style={{ borderTop: "1px solid var(--border-custom)", paddingTop: 16 }}
      >
        <Button variant="primary" size="md" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : client ? "Save changes" : "Create client"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspaces/client-form.tsx
git commit -m "feat: add ClientForm with color presets and preview"
```

---

### Task 5: Client Card Component

**Files:**
- Create: `src/components/workspaces/client-card.tsx`

- [ ] **Step 1: Create the client card**

Create `src/components/workspaces/client-card.tsx`. This faithfully replicates the mockup's client card from AllClientsScreen.

```typescript
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

interface ClientCardProps {
  client: {
    id: string;
    name: string;
    industry: string;
    colour: string;
    bgColour: string;
    initials: string;
    campaigns: {
      id: string;
      name: string;
      status: string;
    }[];
    _count: {
      campaigns: number;
    };
  };
  contactCount: number;
}

function campaignBadgeVariant(status: string): "active" | "outreach" | "draft" {
  if (status === "active") return "active";
  if (status === "outreach") return "outreach";
  return "draft";
}

function campaignBadgeLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "outreach") return "Outreach";
  if (status === "draft") return "Draft";
  if (status === "complete") return "Complete";
  return status;
}

export function ClientCard({ client, contactCount }: ClientCardProps) {
  const activeCampaigns = client.campaigns
    .filter((c) => c.status !== "complete")
    .slice(0, 2);

  return (
    <Link
      href={`/workspaces/${client.id}`}
      className="block rounded-[10px] transition-colors duration-[120ms]"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-custom)",
        padding: "18px 20px",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-mid)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-custom)")}
    >
      {/* Client header */}
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex shrink-0 items-center justify-center rounded-[9px] text-[13px] font-bold"
          style={{
            width: 38,
            height: 38,
            background: client.bgColour,
            color: client.colour,
          }}
        >
          {client.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[14px] font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {client.name}
          </div>
          <div
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            {client.industry}
          </div>
        </div>
        <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
      </div>

      {/* Stats strip */}
      <div
        className="mb-3.5 grid grid-cols-3 overflow-hidden rounded-[7px]"
        style={{ gap: 1, background: "var(--border-custom)" }}
      >
        {[
          ["Contacts", contactCount],
          ["Campaigns", client._count.campaigns],
          ["Coverage", "—"],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="px-2.5 py-[9px]"
            style={{ background: "var(--page-bg)" }}
          >
            <div
              className="text-[11px] font-medium uppercase tracking-[0.06em]"
              style={{ color: "var(--text-muted-custom)" }}
            >
              {label}
            </div>
            <div
              className="mt-0.5 text-[14px] font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Active campaigns */}
      {activeCampaigns.length > 0 && (
        <>
          <div
            className="mb-[7px] text-[11px] font-semibold uppercase tracking-[0.07em]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            Active campaigns
          </div>
          <div className="flex flex-col gap-[5px]">
            {activeCampaigns.map((camp) => (
              <div key={camp.id} className="flex items-center gap-2">
                <div
                  className="flex-1 truncate text-[12px]"
                  style={{ color: "var(--text-primary)" }}
                >
                  {camp.name}
                </div>
                <Badge variant={campaignBadgeVariant(camp.status)}>
                  {campaignBadgeLabel(camp.status)}
                </Badge>
              </div>
            ))}
          </div>
        </>
      )}

      {activeCampaigns.length === 0 && (
        <div className="text-[12px]" style={{ color: "var(--text-muted-custom)" }}>
          No active campaigns
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspaces/client-card.tsx
git commit -m "feat: add ClientCard component matching mockup"
```

---

### Task 6: Stats Strip Component

**Files:**
- Create: `src/components/workspaces/stats-bar.tsx`

- [ ] **Step 1: Create reusable stats bar**

Create `src/components/workspaces/stats-bar.tsx`:
```typescript
import { Card } from "@/components/ui/card";

interface Stat {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface StatsBarProps {
  stats: Stat[];
}

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-2.5">
      {stats.map((stat) => (
        <Card key={stat.label} className="px-3.5 py-3 md:px-[18px] md:py-[15px]">
          <div
            className="text-[16px] font-bold leading-none tracking-tight md:text-[20px]"
            style={{ color: "var(--text-primary)" }}
          >
            {stat.value}
          </div>
          <div
            className="mt-[5px] text-[12px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {stat.label}
          </div>
          {stat.sublabel && (
            <div
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--text-muted-custom)" }}
            >
              {stat.sublabel}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/workspaces/stats-bar.tsx
git commit -m "feat: add StatsBar component"
```

---

### Task 7: All Clients Screen (/workspaces)

**Files:**
- Modify: `src/app/(app)/workspaces/page.tsx`

- [ ] **Step 1: Build the AllClientsScreen**

Replace `src/app/(app)/workspaces/page.tsx` with a Server Component that fetches data and renders the overview. Read the existing file first.

```typescript
import { db } from "@/lib/db";
import { getClients, getOrganizationStats } from "@/lib/queries/client-queries";
import { StatsBar } from "@/components/workspaces/stats-bar";
import { ClientCard } from "@/components/workspaces/client-card";
import { AddClientButton } from "@/components/workspaces/add-client-button";
import { Icon } from "@/components/ui/icon";

export default async function WorkspacesPage() {
  // Get or create the default org
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({
      data: { name: "NWPR", currency: "AUD" },
    });
  }

  const [clients, stats] = await Promise.all([
    getClients(org.id),
    getOrganizationStats(org.id),
  ]);

  // For contact counts per client, we need a separate query
  // since contacts are org-level, not client-level (linked via campaigns)
  const contactCountsByClient = new Map<string, number>();
  for (const client of clients) {
    const count = await db.campaignContact.count({
      where: { campaign: { clientId: client.id } },
    });
    contactCountsByClient.set(client.id, count);
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${Math.round(value / 1000)}k`;
    return `$${value}`;
  };

  return (
    <div className="p-4 md:p-6">
      {/* Summary stats */}
      <div className="mb-5 md:mb-6">
        <StatsBar
          stats={[
            {
              value: stats.clientCount,
              label: "Active clients",
              sublabel: "Across all workspaces",
            },
            {
              value: stats.contactCount,
              label: "Total contacts",
              sublabel: "All clients combined",
            },
            {
              value: stats.campaignCount,
              label: "Live campaigns",
              sublabel: "Active & outreach",
            },
            {
              value: formatCurrency(stats.mediaValue),
              label: "Media value",
              sublabel: "All time, all clients",
            },
          ]}
        />
      </div>

      {/* Section label */}
      <div
        className="mb-3 text-[11px] font-semibold uppercase tracking-[0.09em]"
        style={{ color: "var(--text-muted-custom)" }}
      >
        Client workspaces
      </div>

      {/* Client cards grid */}
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {clients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            contactCount={contactCountsByClient.get(client.id) ?? 0}
          />
        ))}
      </div>

      {/* Add new client CTA */}
      <AddClientButton />
    </div>
  );
}
```

- [ ] **Step 2: Create AddClientButton (client component)**

Create `src/components/workspaces/add-client-button.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ClientForm } from "@/components/workspaces/client-form";

export function AddClientButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center justify-center gap-2.5 rounded-[10px] p-5 transition-colors duration-[120ms]"
        style={{
          border: "1px dashed var(--border-mid)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[7px]"
          style={{ border: "1px dashed var(--border-mid)" }}
        >
          <Icon name="plus" size={13} color="var(--text-muted-custom)" />
        </div>
        <span
          className="text-[13px] font-medium"
          style={{ color: "var(--text-sub)" }}
        >
          Add new client workspace
        </span>
      </div>

      <SlideOverPanel open={open} onClose={() => setOpen(false)} title="New Client">
        <ClientForm
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </SlideOverPanel>
    </>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build passes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/workspaces/page.tsx src/components/workspaces/add-client-button.tsx
git commit -m "feat: build AllClientsScreen with live data and add-client flow"
```

---

### Task 8: Client Workspace Screen (/workspaces/[clientId])

**Files:**
- Modify: `src/app/(app)/workspaces/[clientId]/page.tsx`
- Create: `src/components/workspaces/client-hero.tsx`
- Create: `src/components/workspaces/workspace-tabs.tsx`
- Create: `src/components/workspaces/campaign-card.tsx`

- [ ] **Step 1: Create ClientHero component**

Create `src/components/workspaces/client-hero.tsx`:
```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ClientForm } from "@/components/workspaces/client-form";

interface ClientHeroProps {
  client: {
    id: string;
    name: string;
    industry: string;
    colour: string;
    bgColour: string;
    initials: string;
  };
  stats: {
    contactCount: number;
    campaignCount: number;
    coverageCount: number;
    replyRate: number;
  };
}

export function ClientHero({ client, stats }: ClientHeroProps) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div
        className="rounded-[10px] p-5 md:p-6"
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-custom)",
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
          {/* Avatar + Info */}
          <div className="flex items-start gap-3.5">
            <div
              className="flex shrink-0 items-center justify-center rounded-[10px] text-[14px] font-bold"
              style={{
                width: 44,
                height: 44,
                background: client.bgColour,
                color: client.colour,
              }}
            >
              {client.initials}
            </div>
            <div>
              <h1
                className="text-[18px] font-bold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {client.name}
              </h1>
              <div
                className="mt-0.5 text-[12px]"
                style={{ color: "var(--text-muted-custom)" }}
              >
                {client.industry} · Client workspace
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 md:ml-auto">
            <Button variant="default" size="sm" icon="settings" onClick={() => setEditOpen(true)}>
              Settings
            </Button>
            <Button variant="primary" size="sm" icon="plus">
              New campaign
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div
          className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[7px] md:grid-cols-4"
          style={{ background: "var(--border-custom)" }}
        >
          {[
            ["Contacts", stats.contactCount],
            ["Campaigns", stats.campaignCount],
            ["Coverage hits", stats.coverageCount],
            ["Reply rate", `${stats.replyRate}%`],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="px-2.5 py-[9px]"
              style={{ background: "var(--page-bg)" }}
            >
              <div
                className="text-[11px] font-medium uppercase tracking-[0.06em]"
                style={{ color: "var(--text-muted-custom)" }}
              >
                {label}
              </div>
              <div
                className="mt-0.5 text-[14px] font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SlideOverPanel open={editOpen} onClose={() => setEditOpen(false)} title="Edit Client">
        <ClientForm
          client={client}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      </SlideOverPanel>
    </>
  );
}
```

- [ ] **Step 2: Create CampaignCard component**

Create `src/components/workspaces/campaign-card.tsx`:
```typescript
import { Badge } from "@/components/ui/badge";

interface CampaignCardProps {
  campaign: {
    id: string;
    name: string;
    type: string;
    status: string;
    _count?: {
      campaignContacts: number;
      outreaches: number;
      coverages: number;
    };
    dueDate?: Date | null;
    campaignContacts?: { status: string }[];
    outreaches?: { status: string }[];
    coverages?: { id: string }[];
  };
}

function statusVariant(status: string): "active" | "outreach" | "draft" {
  if (status === "active") return "active";
  if (status === "outreach") return "outreach";
  return "draft";
}

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const contacts = campaign.campaignContacts?.length ?? 0;
  const replies = campaign.outreaches?.filter((o) => o.status === "replied").length ?? 0;
  const hits = campaign.coverages?.length ?? 0;

  // Calculate outreach progress
  const totalOutreach = campaign.outreaches?.length ?? 0;
  const sent = campaign.outreaches?.filter((o) => o.status !== "draft").length ?? 0;
  const pct = totalOutreach > 0 ? Math.round((sent / totalOutreach) * 100) : 0;

  return (
    <div
      className="rounded-[10px] p-4 md:p-5"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border-custom)",
      }}
    >
      {/* Type label */}
      <div
        className="text-[11px] font-medium uppercase tracking-[0.06em]"
        style={{ color: "var(--text-muted-custom)" }}
      >
        {campaign.type}
      </div>

      {/* Name + status */}
      <div className="mt-1 flex items-center gap-2">
        <div
          className="flex-1 text-[14px] font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {campaign.name}
        </div>
        <Badge variant={statusVariant(campaign.status)}>
          {statusLabel(campaign.status)}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium" style={{ color: "var(--text-sub)" }}>
            Outreach progress
          </span>
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
            {pct}%
          </span>
        </div>
        <div
          className="h-[3px] overflow-hidden rounded-full"
          style={{ background: "var(--border-custom)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: "var(--accent-custom)",
            }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div
        className="mt-3 grid grid-cols-4 gap-px overflow-hidden rounded-[6px]"
        style={{ background: "var(--border-custom)" }}
      >
        {[
          ["Contacts", contacts],
          ["Replies", replies],
          ["Coverage", hits],
          ["Due", campaign.dueDate ? new Date(campaign.dueDate).toLocaleDateString("en-AU", { month: "short", day: "numeric" }) : "—"],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="px-2 py-[7px]"
            style={{ background: "var(--page-bg)" }}
          >
            <div
              className="text-[10px] font-medium uppercase tracking-[0.05em]"
              style={{ color: "var(--text-muted-custom)" }}
            >
              {label}
            </div>
            <div
              className="mt-0.5 text-[13px] font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create WorkspaceTabs component**

Create `src/components/workspaces/workspace-tabs.tsx`:
```typescript
"use client";

import { useState } from "react";
import { CampaignCard } from "@/components/workspaces/campaign-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

const TABS = ["Campaigns", "Contacts", "Outreach", "Coverage"] as const;
type TabName = (typeof TABS)[number];

interface WorkspaceTabsProps {
  campaigns: {
    id: string;
    name: string;
    type: string;
    status: string;
    dueDate: Date | null;
    campaignContacts: { status: string; contact: { id: string; name: string; initials: string; avatarBg: string; avatarFg: string; publication: string; beat: string; tier: string; health: string } }[];
    outreaches: { status: string }[];
    coverages: { id: string }[];
  }[];
}

export function WorkspaceTabs({ campaigns }: WorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabName>("Campaigns");

  return (
    <div className="mt-5">
      {/* Tab bar */}
      <div
        className="flex gap-0 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--border-custom)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="shrink-0 px-4 py-2.5 text-[13px] font-medium transition-colors"
            style={{
              color: activeTab === tab ? "var(--accent-custom)" : "var(--text-sub)",
              borderBottom: activeTab === tab ? "2px solid var(--accent-custom)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === "Campaigns" && (
          <div className="flex flex-col gap-3">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="text-[13px]" style={{ color: "var(--text-muted-custom)" }}>
                  No campaigns yet
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "Contacts" && (
          <div className="flex flex-col gap-2">
            {campaigns.flatMap((c) => c.campaignContacts).length > 0 ? (
              [...new Map(
                campaigns
                  .flatMap((c) => c.campaignContacts)
                  .map((cc) => [cc.contact.id, cc.contact])
              ).values()].map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                  style={{ border: "1px solid var(--border-custom)", background: "var(--card-bg)" }}
                >
                  <Avatar initials={contact.initials} bg={contact.avatarBg} fg={contact.avatarFg} size={30} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                      {contact.name}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--text-sub)" }}>
                      {contact.publication}
                    </div>
                  </div>
                  <Badge variant={contact.tier === "A" ? "solid" : "default"}>
                    {contact.tier}-list
                  </Badge>
                  <Badge variant={contact.health === "warm" ? "warm" : "cool"}>
                    {contact.health === "warm" ? "Warm" : "Cool"}
                  </Badge>
                  <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="text-[13px]" style={{ color: "var(--text-muted-custom)" }}>
                  No contacts linked to campaigns yet
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "Outreach" && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                Outreach
              </div>
              <div className="mt-1 text-[12px]" style={{ color: "var(--text-muted-custom)" }}>
                Coming in Phase 5
              </div>
            </div>
          </div>
        )}

        {activeTab === "Coverage" && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                Coverage
              </div>
              <div className="mt-1 text-[12px]" style={{ color: "var(--text-muted-custom)" }}>
                Coming in Phase 6
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build the ClientWorkspace page**

Replace `src/app/(app)/workspaces/[clientId]/page.tsx`. Read it first.

```typescript
import { notFound } from "next/navigation";
import { getClientById, getClientStats } from "@/lib/queries/client-queries";
import { ClientHero } from "@/components/workspaces/client-hero";
import { WorkspaceTabs } from "@/components/workspaces/workspace-tabs";

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientWorkspacePage({ params }: PageProps) {
  const { clientId } = await params;
  const [client, stats] = await Promise.all([
    getClientById(clientId),
    getClientStats(clientId),
  ]);

  if (!client) {
    notFound();
  }

  // Transform campaigns for the tabs component
  const campaigns = client.campaigns.map((c) => ({
    ...c,
    dueDate: c.dueDate,
    campaignContacts: c.campaignContacts.map((cc) => ({
      ...cc,
      contact: cc.contact || { id: "", name: "", initials: "", avatarBg: "", avatarFg: "", publication: "", beat: "", tier: "", health: "" },
    })),
    outreaches: c.outreaches || [],
    coverages: c.coverages || [],
  }));

  return (
    <div className="p-4 md:p-6">
      <ClientHero client={client} stats={stats} />
      <WorkspaceTabs campaigns={campaigns} />
    </div>
  );
}
```

Note: The `getClientById` query needs to be updated to include contact details in campaignContacts. Update `src/lib/queries/client-queries.ts` — modify the `getClientById` function's include to:

```typescript
export async function getClientById(clientId: string) {
  return db.client.findUnique({
    where: { id: clientId },
    include: {
      campaigns: {
        include: {
          campaignContacts: {
            include: {
              contact: {
                select: {
                  id: true,
                  name: true,
                  initials: true,
                  avatarBg: true,
                  avatarFg: true,
                  publication: true,
                  beat: true,
                  tier: true,
                  health: true,
                },
              },
            },
          },
          outreaches: {
            select: { status: true },
          },
          coverages: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build passes.

- [ ] **Step 6: Commit**

```bash
git add src/components/workspaces/ src/app/\(app\)/workspaces/ src/lib/queries/
git commit -m "feat: build ClientWorkspace screen with hero, tabs, campaigns"
```

---

### Task 9: Workspace Switcher

**Files:**
- Create: `src/components/workspaces/workspace-switcher.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/mobile-drawer.tsx`

- [ ] **Step 1: Create the WorkspaceSwitcher**

Create `src/components/workspaces/workspace-switcher.tsx`:
```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Divider } from "@/components/ui/divider";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ClientForm } from "@/components/workspaces/client-form";

interface ClientItem {
  id: string;
  name: string;
  industry: string;
  colour: string;
  bgColour: string;
  initials: string;
}

interface WorkspaceSwitcherProps {
  clients: ClientItem[];
  activeClientId?: string;
}

export function WorkspaceSwitcher({ clients, activeClientId }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const current = clients.find((c) => c.id === activeClientId);

  const handleSelect = (clientId?: string) => {
    setOpen(false);
    if (clientId) {
      router.push(`/workspaces/${clientId}`);
    } else {
      router.push("/workspaces");
    }
  };

  return (
    <>
      <div ref={ref} className="relative mx-2 mb-1">
        {/* Trigger */}
        <div
          onClick={() => setOpen((o) => !o)}
          className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-[7px] transition-all duration-[120ms]"
          style={{
            background: open ? "var(--active-bg)" : "var(--hover-bg)",
            border: "1px solid var(--border-custom)",
          }}
        >
          {current ? (
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-bold"
              style={{ background: current.bgColour, color: current.colour }}
            >
              {current.initials}
            </div>
          ) : (
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px]"
              style={{ background: "var(--active-bg)" }}
            >
              <Icon name="workspace" size={11} color="var(--text-sub)" />
            </div>
          )}
          <span
            className="flex-1 truncate text-[12px] font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            {current ? current.name : "All clients"}
          </span>
          <Icon name="chevronD" size={12} color="var(--text-muted-custom)" />
        </div>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-[300] overflow-hidden rounded-[9px]"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-custom)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
          >
            {/* All clients option */}
            <div
              onClick={() => handleSelect()}
              className="flex cursor-pointer items-center gap-2 px-2.5 py-2 transition-colors duration-100"
              style={{
                background: !activeClientId ? "var(--accent-bg)" : "transparent",
              }}
              onMouseEnter={(e) => { if (activeClientId) e.currentTarget.style.background = "var(--hover-bg)"; }}
              onMouseLeave={(e) => { if (activeClientId) e.currentTarget.style.background = "transparent"; }}
            >
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px]"
                style={{ background: "var(--active-bg)" }}
              >
                <Icon name="workspace" size={11} color={!activeClientId ? "var(--accent-custom)" : "var(--text-sub)"} />
              </div>
              <span
                className="text-[12px]"
                style={{
                  fontWeight: !activeClientId ? 600 : 400,
                  color: !activeClientId ? "var(--accent-text)" : "var(--text-primary)",
                }}
              >
                All clients
              </span>
              {!activeClientId && (
                <Icon name="check" size={12} color="var(--accent-custom)" style={{ marginLeft: "auto" }} />
              )}
            </div>

            <Divider />

            {/* Client list */}
            <div className="py-1">
              {clients.map((client) => {
                const isActive = activeClientId === client.id;
                return (
                  <div
                    key={client.id}
                    onClick={() => handleSelect(client.id)}
                    className="flex cursor-pointer items-center gap-2 px-2.5 py-[7px] transition-colors duration-100"
                    style={{
                      background: isActive ? "var(--accent-bg)" : "transparent",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--hover-bg)"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-bold"
                      style={{ background: client.bgColour, color: client.colour }}
                    >
                      {client.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="truncate text-[12px]"
                        style={{
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "var(--accent-text)" : "var(--text-primary)",
                        }}
                      >
                        {client.name}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--text-muted-custom)" }}>
                        {client.industry}
                      </div>
                    </div>
                    {isActive && <Icon name="check" size={12} color="var(--accent-custom)" />}
                  </div>
                );
              })}
            </div>

            <Divider />

            {/* Add client */}
            <div className="p-1.5">
              <div
                onClick={() => { setOpen(false); setAddOpen(true); }}
                className="flex cursor-pointer items-center gap-[7px] rounded-[7px] px-2 py-[7px] text-[12px] transition-colors"
                style={{ color: "var(--text-sub)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon name="plus" size={13} color="var(--text-muted-custom)" />
                Add new client
              </div>
            </div>
          </div>
        )}
      </div>

      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="New Client">
        <ClientForm
          onSuccess={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      </SlideOverPanel>
    </>
  );
}
```

- [ ] **Step 2: Update Sidebar to use WorkspaceSwitcher**

Read `src/components/layout/sidebar.tsx` first. Then replace the static workspace switcher placeholder with a data-fetching wrapper. Since the Sidebar is a client component, we need to pass clients as props from a server component.

Create a new server wrapper: `src/components/layout/sidebar-wrapper.tsx`:
```typescript
import { db } from "@/lib/db";
import { SidebarClient } from "@/components/layout/sidebar";

export async function SidebarWrapper() {
  const org = await db.organization.findFirst();
  const clients = org
    ? await db.client.findMany({
        where: { organizationId: org.id },
        select: { id: true, name: true, industry: true, colour: true, bgColour: true, initials: true },
        orderBy: { name: "asc" },
      })
    : [];

  return <SidebarClient clients={clients} />;
}
```

Then refactor `sidebar.tsx` to:
- Export a `SidebarClient` component that accepts a `clients` prop
- Replace the static workspace switcher div with `<WorkspaceSwitcher clients={clients} activeClientId={activeClientId} />`
- Extract the `activeClientId` from the URL using `usePathname()`: if pathname matches `/workspaces/[id]`, extract that ID

Similarly update `mobile-drawer.tsx` to accept and pass `clients` to a `WorkspaceSwitcher` inside the drawer.

Update `app-shell.tsx` to use `SidebarWrapper` instead of `Sidebar` directly. Since AppShell is a client component, the server wrapper needs to be rendered in the `(app)/layout.tsx` server component instead.

Alternative simpler approach: fetch clients in the `(app)/layout.tsx` server component and pass them through AppShell as a prop.

The exact refactoring depends on the current code — the implementer should read all layout files first and choose the cleanest approach.

- [ ] **Step 3: Verify build and test**

Run: `npm run build`
Then: `npm run dev`

Test:
- Workspace switcher shows all clients
- Clicking a client navigates to `/workspaces/[id]`
- Active client is highlighted with checkmark
- "All clients" option navigates to `/workspaces`
- "Add new client" opens the slide-over form

- [ ] **Step 4: Commit**

```bash
git add src/components/workspaces/workspace-switcher.tsx src/components/layout/
git commit -m "feat: add functional WorkspaceSwitcher with client navigation"
```

---

### Task 10: Final Verification and Push

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: Clean build, no errors.

- [ ] **Step 2: Dev server testing**

Run: `npm run dev`

Verify:
1. `/workspaces` — shows stats bar, empty state with add-client CTA
2. Click "Add new client workspace" — slide-over opens, fill form, submit
3. Client card appears in grid with correct initials/colors
4. Click client card → navigates to `/workspaces/[id]`
5. Client workspace shows hero, stats, tabs
6. Workspace switcher in sidebar shows the new client
7. Theme toggle: both light and dark mode render correctly
8. Mobile: hamburger drawer works, workspace switcher works in drawer
9. Edit client: click Settings on workspace → slide-over with prefilled form

- [ ] **Step 3: Push to GitHub (auto-deploys to Vercel)**

```bash
git push origin main
```

---

## Phase 1 Completion Checklist

- [ ] Client queries (getClients, getClientById, getOrganizationStats, getClientStats)
- [ ] Server Actions (createClient, updateClient)
- [ ] SlideOverPanel shared component (reusable for all future forms)
- [ ] ClientForm with color presets, auto-initials, preview
- [ ] AllClientsScreen: stats bar, client card grid, add-client CTA
- [ ] ClientWorkspace: hero, stats strip, 4 tabs (Campaigns + Contacts live, Outreach + Coverage placeholder)
- [ ] WorkspaceSwitcher: functional dropdown, client navigation, add-client from dropdown
- [ ] CampaignCard with progress bar and metrics
- [ ] All screens work in light and dark mode
- [ ] Mobile responsive (cards stack, drawer works)
- [ ] Data persists in Neon Postgres
- [ ] Deployed and working on Vercel
