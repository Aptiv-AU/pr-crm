"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setSettingsOpen(false);
    router.refresh();
  }

  return (
    <>
      <Card style={{ padding: 0 }}>
        <div className="p-5 md:p-6">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
              {/* Initials badge */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: client.bgColour,
                  color: client.colour,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {client.initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.3,
                  }}
                >
                  {client.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted-custom)",
                    lineHeight: 1.3,
                  }}
                >
                  {client.industry}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }} className="ml-0 md:ml-auto">
              <Button variant="default" size="sm" icon="settings" onClick={() => setSettingsOpen(true)}>
                Settings
              </Button>
              <Button variant="primary" size="sm" icon="plus">
                New campaign
              </Button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Contacts", value: stats.contactCount },
              { label: "Campaigns", value: stats.campaignCount },
              { label: "Coverage hits", value: stats.coverageCount },
              { label: "Reply rate", value: `${stats.replyRate}%` },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  backgroundColor: "var(--page-bg)",
                  border: "1px solid var(--border-custom)",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted-custom)",
                    marginTop: 2,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <SlideOverPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Edit Client">
        <ClientForm client={client} onSuccess={handleSuccess} />
      </SlideOverPanel>
    </>
  );
}
