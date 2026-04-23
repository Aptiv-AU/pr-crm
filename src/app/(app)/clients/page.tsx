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
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({
      data: { name: "NWPR", currency: "AUD" },
    });
  }

  const [clients, orgStats, totalMonthlyCents, fullOrg] = await Promise.all([
    getClients(org.id),
    getOrganizationStats(org.id),
    getTotalMonthlyRetainerCents(org.id),
    getCurrentOrg(),
  ]);

  const locale = fullOrg?.locale || "en-AU";
  const currency = fullOrg?.currency || "AUD";

  const [clientContactCounts, retainerByClient] = await Promise.all([
    Promise.all(
      clients.map((client) =>
        db.campaignContact.count({
          where: { campaign: { clientId: client.id } },
        })
      )
    ),
    getActiveRetainerByClientIds(clients.map((c) => c.id)),
  ]);

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
