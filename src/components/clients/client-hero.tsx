"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ClientForm } from "@/components/clients/client-form";
import { archiveClient } from "@/actions/client-actions";
import { ClientBadge } from "@/components/shared/client-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface ClientHeroProps {
  client: {
    id: string;
    name: string;
    industry: string;
    colour: string;
    bgColour: string;
    initials: string;
    logo?: string | null;
  };
  stats: {
    contactCount: number;
    campaignCount: number;
    coverageCount: number;
    replyRate: number;
  };
  hasActiveCampaigns?: boolean;
}

export function ClientHero({ client, hasActiveCampaigns = true }: ClientHeroProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setSettingsOpen(false);
    router.refresh();
  }

  async function handleArchiveConfirm() {
    await archiveClient(client.id);
    router.push("/clients");
  }

  return (
    <>
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <ClientBadge client={client} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                }}
              >
                {client.name}
              </span>
              {hasActiveCampaigns && (
                <Badge variant="active">Active retainer</Badge>
              )}
            </div>
            <div
              style={{
                fontSize: 14,
                fontStyle: "italic",
                color: "var(--text-sub)",
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              {client.industry}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginLeft: "auto",
            }}
          >
            <Button
              variant="outline"
              size="sm"
              icon="edit"
              onClick={() => setSettingsOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchiveConfirm(true)}
            >
              Archive
            </Button>
            <Button variant="primary" size="sm" icon="plus">
              New campaign
            </Button>
          </div>
        </div>
      </Card>

      {showArchiveConfirm && (
        <ConfirmDialog
          title={`Archive ${client.name}?`}
          body="This client and all their campaigns will be hidden. You can restore them later."
          confirmLabel="Archive"
          onConfirm={handleArchiveConfirm}
          onCancel={() => setShowArchiveConfirm(false)}
        />
      )}

      <SlideOverPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Edit Client"
      >
        <ClientForm client={client} onSuccess={handleSuccess} />
      </SlideOverPanel>
    </>
  );
}
