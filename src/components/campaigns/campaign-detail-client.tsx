"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CampaignHero } from "@/components/campaigns/campaign-hero";
import { CampaignTabs } from "@/components/campaigns/campaign-tabs";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { CampaignForm } from "@/components/campaigns/campaign-form";
import { Button } from "@/components/ui/button";
import { updatePhaseStatus, revertToPhase, completeCampaign, reopenCampaign, archiveCampaign } from "@/actions/campaign-actions";

interface CampaignDetailClientProps {
  campaign: {
    id: string;
    name: string;
    type: string;
    status: string;
    budget: number | null;
    startDate: string | null;
    dueDate: string | null;
    brief: string | null;
    clientId: string;
    client: {
      id: string;
      name: string;
      industry: string | null;
      initials: string;
      colour: string;
      bgColour: string;
      logo?: string | null;
    };
    phases: { id: string; name: string; order: number; status: string }[];
    campaignContacts: {
      id: string;
      contactId: string;
      status: string;
      contact: {
        id: string;
        name: string;
        initials: string;
        avatarBg: string;
        avatarFg: string;
        publication: string | null;
        beat: string | null;
        tier: string | null;
        health: string | null;
      };
    }[];
    campaignSuppliers: {
      id: string;
      supplierId: string;
      role: string | null;
      agreedCost: number | null;
      status: string;
      supplier: {
        id: string;
        name: string;
        serviceCategory: string | null;
      };
    }[];
    budgetLineItems: {
      id: string;
      description: string;
      amount: number;
      confirmed: boolean;
      supplier: { id: string; name: string } | null;
    }[];
    coverages: {
      id: string;
      publication: string;
      date: string;
      type: string;
      url: string | null;
      mediaValue: number | null;
      attachmentUrl: string | null;
      notes: string | null;
      campaignId: string | null;
      contactId: string | null;
      contact: { id: string; name: string } | null;
    }[];
    outreaches: {
      id: string;
      subject: string;
      body: string;
      status: string;
      generatedByAI: boolean;
      contactId: string;
      sentAt: string | null;
      followUpNumber: number;
      contact: {
        id: string;
        name: string;
        initials: string;
        avatarBg: string;
        avatarFg: string;
        email: string | null;
        publication: string | null;
      };
    }[];
  };
  budgetStats: { spent: number; total: number | null };
  availableContacts: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    publication: string | null;
  }[];
  availableSuppliers: {
    id: string;
    name: string;
    serviceCategory: string | null;
  }[];
  clients: { id: string; name: string; initials: string; colour: string; bgColour: string }[];
  emailConnected: boolean;
  eventDetail?: {
    id: string;
    venue: string | null;
    eventDate: string | null;
    eventTime: string | null;
    guestCount: number | null;
    runsheetEntries: {
      id: string;
      time: string;
      activity: string;
      order: number;
    }[];
  } | null;
}

export function CampaignDetailClient({
  campaign,
  budgetStats,
  availableContacts,
  availableSuppliers,
  clients,
  emailConnected,
  eventDetail,
}: CampaignDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [, startTransition] = useTransition();

  function handleEditSuccess() {
    setEditOpen(false);
    router.refresh();
  }

  function handleAdvancePhase(phaseId: string) {
    startTransition(async () => {
      await updatePhaseStatus(phaseId, "complete");
      router.refresh();
    });
  }

  function handleRevertPhase(phaseId: string) {
    startTransition(async () => {
      await revertToPhase(phaseId);
      router.refresh();
    });
  }

  function handleComplete() {
    startTransition(async () => {
      await completeCampaign(campaign.id);
      router.refresh();
    });
  }

  function handleReopen() {
    startTransition(async () => {
      await reopenCampaign(campaign.id);
      router.refresh();
    });
  }

  async function confirmArchive() {
    await archiveCampaign(campaign.id);
    router.push("/campaigns");
  }

  return (
    <div className="p-4 md:p-6">
      <CampaignHero
        campaign={campaign}
        budgetStats={budgetStats}
        onEdit={() => setEditOpen(true)}
        onAdvancePhase={handleAdvancePhase}
        onRevertPhase={handleRevertPhase}
        onComplete={handleComplete}
        onReopen={handleReopen}
        onArchive={() => setShowArchiveConfirm(true)}
      />

      {showArchiveConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, backgroundColor: "var(--overlay)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
          onClick={() => setShowArchiveConfirm(false)}
        >
          <div
            style={{
              backgroundColor: "var(--card-bg)", borderRadius: 12, padding: 24,
              maxWidth: 380, width: "100%", margin: "0 16px",
              border: "1px solid var(--border-custom)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Archive campaign?
            </div>
            <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 20 }}>
              This campaign will be hidden from the campaigns list. You can restore it from the archived view.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => setShowArchiveConfirm(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={confirmArchive}>Archive</Button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <CampaignTabs
          phases={campaign.phases}
          campaignContacts={campaign.campaignContacts}
          campaignId={campaign.id}
          campaignType={campaign.type}
          availableContacts={availableContacts}
          campaignSuppliers={campaign.campaignSuppliers}
          availableSuppliers={availableSuppliers}
          budgetLineItems={campaign.budgetLineItems}
          totalBudget={campaign.budget}
          campaign={{
            id: campaign.id,
            brief: campaign.brief,
            client: campaign.client,
          }}
          outreaches={campaign.outreaches}
          coverages={campaign.coverages}
          campaignName={campaign.name}
          emailConnected={emailConnected}
          eventDetail={eventDetail}
        />
      </div>

      <SlideOverPanel open={editOpen} onClose={() => setEditOpen(false)} title="Edit Campaign">
        {editOpen && (
          <CampaignForm
            campaign={{
              id: campaign.id,
              name: campaign.name,
              type: campaign.type,
              status: campaign.status,
              budget: campaign.budget,
              startDate: campaign.startDate,
              dueDate: campaign.dueDate,
              brief: campaign.brief,
              clientId: campaign.clientId,
            }}
            clients={clients}
            onSuccess={handleEditSuccess}
          />
        )}
      </SlideOverPanel>
    </div>
  );
}
