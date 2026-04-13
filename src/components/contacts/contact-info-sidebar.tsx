import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Divider } from "@/components/ui/divider";

interface CampaignContactData {
  id: string;
  status: string;
  campaign: {
    id: string;
    name: string;
    type: string;
    status: string;
    client: {
      id: string;
      name: string;
      initials: string;
      colour: string;
      bgColour: string;
    };
  };
}

interface ContactInfoSidebarProps {
  contact: {
    email: string | null;
    phone: string | null;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
    campaignContacts: CampaignContactData[];
  };
}

const campaignStatusVariantMap: Record<string, BadgeVariant> = {
  active: "active",
  draft: "draft",
  completed: "default",
  paused: "cool",
};

const infoFields = [
  { label: "Email", key: "email" as const },
  { label: "Phone", key: "phone" as const },
  { label: "Instagram", key: "instagram" as const },
  { label: "Twitter", key: "twitter" as const },
  { label: "LinkedIn", key: "linkedin" as const },
];

export function ContactInfoSidebar({ contact }: ContactInfoSidebarProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Contact Info Card */}
      <Card style={{ padding: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-sub)",
            marginBottom: 12,
          }}
        >
          Contact Info
        </div>
        {infoFields.map((field, i) => (
          <div key={field.key}>
            {i > 0 && <Divider style={{ margin: "8px 0" }} />}
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted-custom)",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              {field.label}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-primary)",
              }}
            >
              {contact[field.key] || "\u2014"}
            </div>
          </div>
        ))}
      </Card>

      {/* Campaigns Card */}
      <Card style={{ padding: 16 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-sub)",
            marginBottom: 12,
          }}
        >
          Campaigns
        </div>
        {contact.campaignContacts.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted-custom)",
            }}
          >
            No campaigns linked
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {contact.campaignContacts.map((cc) => (
              <div
                key={cc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    backgroundColor: cc.campaign.client.bgColour,
                    color: cc.campaign.client.colour,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {cc.campaign.client.initials}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cc.campaign.name}
                </div>
                <Badge variant={campaignStatusVariantMap[cc.campaign.status] ?? "default"}>
                  {cc.campaign.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
