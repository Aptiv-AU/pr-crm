"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampaignHero } from "@/components/campaigns/campaign-hero";
import { CampaignTabs } from "@/components/campaigns/campaign-tabs";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { CampaignForm } from "@/components/campaigns/campaign-form";

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
      supplier: { id: string; name: string } | null;
    }[];
    coverages: {
      id: string;
      publication: string | null;
      date: string | null;
      type: string | null;
      mediaValue: number | null;
    }[];
    outreaches: {
      id: string;
      subject: string;
      body: string;
      status: string;
      generatedByAI: boolean;
      contactId: string;
      contact: {
        id: string;
        name: string;
        initials: string;
        avatarBg: string;
        avatarFg: string;
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
}

export function CampaignDetailClient({
  campaign,
  budgetStats,
  availableContacts,
  availableSuppliers,
  clients,
}: CampaignDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  function handleEditSuccess() {
    setEditOpen(false);
    router.refresh();
  }

  return (
    <div className="p-4 md:p-6">
      <CampaignHero
        campaign={campaign}
        budgetStats={budgetStats}
        onEdit={() => setEditOpen(true)}
      />

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
