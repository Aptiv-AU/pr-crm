import { db } from "@/lib/db";
import { getClients, getOrganizationStats } from "@/lib/queries/client-queries";
import { StatsBar } from "@/components/shared/stats-bar";
import { ClientCard } from "@/components/clients/client-card";
import { AddClientButton } from "@/components/clients/add-client-button";
import { EmptyState } from "@/components/shared/empty-state";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  // Get or create default org
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({
      data: { name: "NWPR", currency: "AUD" },
    });
  }

  // Fetch clients and org stats in parallel
  const [clients, orgStats] = await Promise.all([
    getClients(org.id),
    getOrganizationStats(org.id),
  ]);

  // For each client, count contacts via campaignContacts
  const clientContactCounts = await Promise.all(
    clients.map((client) =>
      db.campaignContact.count({
        where: { campaign: { clientId: client.id } },
      })
    )
  );

  // Format media value
  const mv = Number(orgStats.mediaValue);
  const mediaValueFormatted =
    mv >= 1000 ? `$${Math.round(mv / 1000)}k` : `$${mv}`;

  const stats = [
    { value: orgStats.clientCount, label: "Active clients" },
    { value: orgStats.contactCount, label: "Total contacts" },
    { value: orgStats.campaignCount, label: "Live campaigns" },
    { value: mediaValueFormatted, label: "Media value" },
  ];

  return (
    <div style={{ padding: "16px" }} className="md:p-6">
      <StatsBar stats={stats} />

      <div style={{ marginTop: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-muted-custom)",
            marginBottom: 10,
          }}
        >
          Clients
        </div>

        {clients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {clients.map((client, idx) => (
              <ClientCard
                key={client.id}
                client={client}
                contactCount={clientContactCounts[idx]}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="workspace"
            title="Welcome to Pressroom"
            description="Add your first client to start managing campaigns, contacts, and coverage."
          />
        )}

        <div style={{ marginTop: 12 }}>
          <AddClientButton />
        </div>
      </div>
    </div>
  );
}
