import { notFound } from "next/navigation";
import { getClientById, getClientStats } from "@/lib/queries/client-queries";
import { ClientHero } from "@/components/workspaces/client-hero";
import { WorkspaceTabs } from "@/components/workspaces/workspace-tabs";

export default async function ClientWorkspacePage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const [client, stats] = await Promise.all([
    getClientById(clientId),
    getClientStats(clientId),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div style={{ padding: "16px" }} className="md:p-6">
      <ClientHero
        client={{
          id: client.id,
          name: client.name,
          industry: client.industry,
          colour: client.colour,
          bgColour: client.bgColour,
          initials: client.initials,
        }}
        stats={stats}
      />

      <div style={{ marginTop: 20 }}>
        <WorkspaceTabs campaigns={client.campaigns} />
      </div>
    </div>
  );
}
