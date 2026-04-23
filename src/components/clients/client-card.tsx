import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ClientBadge } from "@/components/shared/client-badge";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface ClientCardProps {
  client: {
    id: string;
    slug: string;
    name: string;
    industry: string;
    colour: string;
    bgColour: string;
    initials: string;
    logo?: string | null;
    currency?: string | null;
    createdAt: Date | string;
    campaigns: Campaign[];
    _count: { campaigns: number };
  };
  contactCount: number;
}

const audFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

function formatSince(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

function stageFor(client: ClientCardProps["client"]): {
  label: string;
  variant: BadgeVariant;
} {
  const active = client.campaigns.some((c) => c.status !== "complete");
  if (active) return { label: "Active", variant: "active" };
  return { label: "Paused", variant: "cool" };
}

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

export function ClientCard({ client, contactCount }: ClientCardProps) {
  const stage = stageFor(client);
  const campaignCount = client._count.campaigns;

  return (
    <Link
      href={`/clients/${client.slug}`}
      className="block transition-shadow"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Card style={{ padding: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
          }}
        >
          <ClientBadge client={client} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                  color: "var(--text-primary)",
                }}
              >
                {client.name}
              </span>
              <Badge variant={stage.variant}>{stage.label}</Badge>
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-sub)",
                fontStyle: "italic",
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              {client.industry}
            </div>
          </div>
          <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid var(--border-custom)",
          }}
        >
          <div>
            <MicroLabel>Retainer</MicroLabel>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginTop: 6,
                color: "var(--text-primary)",
              }}
            >
              —
            </div>
          </div>
          <div>
            <MicroLabel>Campaigns</MicroLabel>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginTop: 6,
                color: "var(--text-primary)",
              }}
            >
              {campaignCount}
            </div>
          </div>
          <div>
            <MicroLabel>Contacts</MicroLabel>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginTop: 6,
                color: "var(--text-primary)",
              }}
            >
              {contactCount}
            </div>
          </div>
          <div>
            <MicroLabel>Since</MicroLabel>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginTop: 6,
                color: "var(--text-primary)",
              }}
            >
              {formatSince(client.createdAt)}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export { audFormatter };
