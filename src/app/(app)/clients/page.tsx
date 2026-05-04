import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getClients, getOrganizationStats } from "@/lib/queries/client-queries";
import { ClientCard } from "@/components/clients/client-card";
import { AddClientButton } from "@/components/clients/add-client-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import {
  getActiveRetainerByClientIds,
  getTotalMonthlyRetainerCents,
} from "@/lib/queries/retainer-queries";
import { formatCompactCurrency, formatCurrency } from "@/lib/retainer";
import { getCurrentOrg } from "@/lib/queries/org-queries";

export const dynamic = "force-dynamic";

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "var(--text-muted-custom)",
      }}
    >
      {children}
    </div>
  );
}

interface StatItem {
  label: string;
  value: string;
  sub?: string;
}

function StatRow({ items }: { items: StatItem[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 16,
      }}
    >
      {items.map((it) => (
        <Card key={it.label} style={{ padding: "18px 20px" }}>
          <MicroLabel>{it.label}</MicroLabel>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginTop: 10,
              lineHeight: 1.05,
              color: "var(--text-primary)",
            }}
          >
            {it.value}
          </div>
          {it.sub && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-sub)",
                marginTop: 4,
                fontWeight: 500,
              }}
            >
              {it.sub}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function avgTenureMonths(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const now = Date.now();
  const total = dates.reduce((sum, d) => {
    const months =
      (now - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
    return sum + Math.max(0, months);
  }, 0);
  return Math.round(total / dates.length);
}

export default async function ClientsPage() {
  const org = await getCurrentOrg();
  if (!org) notFound();

  const [clients, orgStats, totalMonthlyCents] = await Promise.all([
    getClients(org.id),
    getOrganizationStats(org.id),
    getTotalMonthlyRetainerCents(org.id),
  ]);

  const locale = org.locale || "en-AU";
  const currency = org.currency || "AUD";

  // P0-3: previously did Promise.all(clients.map(c => count(...))) which
  // generated one DB round trip per client. Replace with a single
  // groupBy keyed off the campaign's clientId so 100 clients become
  // one query.
  const [contactCountRows, retainerByClient] = await Promise.all([
    db.campaignContact.groupBy({
      by: ["campaignId"],
      where: { campaign: { clientId: { in: clients.map((c) => c.id) } } },
      _count: { _all: true },
    }),
    getActiveRetainerByClientIds(clients.map((c) => c.id)),
  ]);

  // groupBy returns by campaignId; collapse to per-client totals via a
  // tiny lookup of campaign → client.
  const campaignClientMap = new Map<string, string>();
  if (contactCountRows.length > 0) {
    const campaigns = await db.campaign.findMany({
      where: { id: { in: contactCountRows.map((r) => r.campaignId) } },
      select: { id: true, clientId: true },
    });
    for (const c of campaigns) campaignClientMap.set(c.id, c.clientId);
  }
  const countsByClientId = new Map<string, number>();
  for (const row of contactCountRows) {
    const clientId = campaignClientMap.get(row.campaignId);
    if (!clientId) continue;
    countsByClientId.set(clientId, (countsByClientId.get(clientId) ?? 0) + row._count._all);
  }
  const clientContactCounts = clients.map((c) => countsByClientId.get(c.id) ?? 0);

  const mv = Number(orgStats.mediaValue);
  const mediaValueFormatted =
    mv >= 1000 ? `A$${Math.round(mv / 1000)}k` : `A$${mv}`;

  const tenure = avgTenureMonths(clients.map((c) => c.createdAt));

  const retainerClientCount = retainerByClient.size;
  const monthlyRetainerFormatted =
    totalMonthlyCents > 0
      ? formatCompactCurrency(totalMonthlyCents, currency, locale)
      : "—";

  const statItems: StatItem[] = [
    {
      label: "Monthly retainer",
      value: monthlyRetainerFormatted,
      sub:
        retainerClientCount > 0
          ? `${retainerClientCount} ${retainerClientCount === 1 ? "client" : "clients"} on retainer`
          : "No retainers set",
    },
    { label: "Active campaigns", value: String(orgStats.campaignCount) },
    { label: "Contacts", value: String(orgStats.contactCount) },
    { label: "Avg tenure", value: tenure > 0 ? `${tenure}mo` : "—" },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Directory"
        title="Clients"
        subtitle="Your roster of stories worth telling."
        meta={[
          { label: "Active", value: String(orgStats.clientCount) },
          { label: "Campaigns", value: String(orgStats.campaignCount) },
          { label: "Media value", value: mediaValueFormatted },
        ]}
        actions={<AddClientButton />}
      />

      <StatRow items={statItems} />

      {clients.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 14,
          }}
          className="max-md:!grid-cols-1"
        >
          {clients.map((client, idx) => {
            const ret = retainerByClient.get(client.id);
            return (
              <ClientCard
                key={client.id}
                client={client}
                contactCount={clientContactCounts[idx]}
                retainer={
                  ret
                    ? {
                        label: formatCurrency(ret.monthlyCents, currency, locale),
                        sub: "per month",
                      }
                    : null
                }
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="workspace"
          title="Welcome to Pressroom"
          description="Add your first client to start managing campaigns, contacts, and coverage."
        />
      )}
    </PageContainer>
  );
}
