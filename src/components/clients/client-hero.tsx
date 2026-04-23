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
import {
  RetainerPanel,
  type RetainerPeriodView,
} from "@/components/clients/retainer-panel";
import {
  CADENCE_SUFFIX,
  formatCurrency,
  monthlyEquivalentCents,
} from "@/lib/retainer";

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
  retainer?: {
    periods: RetainerPeriodView[];
    currency: string;
    locale: string;
    activePeriod: RetainerPeriodView | null;
  };
}

export function ClientHero({
  client,
  hasActiveCampaigns = true,
  retainer,
}: ClientHeroProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [retainerOpen, setRetainerOpen] = useState(false);
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
          {retainer && (
            <RetainerStat
              retainer={retainer}
              onEdit={() => setRetainerOpen(true)}
            />
          )}
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

      {retainer && (
        <RetainerPanel
          open={retainerOpen}
          onClose={() => setRetainerOpen(false)}
          clientId={client.id}
          clientName={client.name}
          periods={retainer.periods}
          currency={retainer.currency}
          locale={retainer.locale}
        />
      )}
    </>
  );
}

function RetainerStat({
  retainer,
  onEdit,
}: {
  retainer: NonNullable<ClientHeroProps["retainer"]>;
  onEdit: () => void;
}) {
  const active = retainer.activePeriod;
  const monthly = active
    ? monthlyEquivalentCents(active.cadence, active.amountCents)
    : 0;

  return (
    <button
      type="button"
      onClick={onEdit}
      title="Manage retainer"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 2,
        padding: "8px 14px",
        borderRadius: 10,
        border: "1px solid var(--border-custom)",
        background: "var(--card-bg)",
        cursor: "pointer",
        textAlign: "left",
        minWidth: 140,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--text-muted-custom)",
        }}
      >
        Retainer
      </span>
      {active ? (
        <>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              lineHeight: 1.1,
            }}
          >
            {formatCurrency(active.amountCents, retainer.currency, retainer.locale)}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-sub)",
                marginLeft: 2,
              }}
            >
              {CADENCE_SUFFIX[active.cadence]}
            </span>
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-sub)",
              fontWeight: 500,
            }}
          >
            {formatCurrency(monthly, retainer.currency, retainer.locale)}/mo
          </span>
        </>
      ) : (
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "var(--accent-custom)",
          }}
        >
          Set retainer →
        </span>
      )}
    </button>
  );
}
