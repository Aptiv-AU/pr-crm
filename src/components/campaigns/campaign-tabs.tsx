"use client";

import { useState, useTransition } from "react";
import { updatePhaseStatus } from "@/actions/campaign-actions";
import { useRouter } from "next/navigation";
import { CampaignPhaseList } from "./campaign-phase-list";
import { CampaignContactsTab } from "./campaign-contacts-tab";
import { CampaignSuppliersTab } from "./campaign-suppliers-tab";
import { CampaignBudget } from "./campaign-budget";
import { DraftPitchesPhase } from "./phase-draft-pitches";

interface CampaignTabsProps {
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
      tier: string | null;
      health: string | null;
    };
  }[];
  campaignId: string;
  campaignType: string;
  availableContacts: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    publication: string | null;
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
  availableSuppliers: {
    id: string;
    name: string;
    serviceCategory: string | null;
  }[];
  budgetLineItems: {
    id: string;
    description: string;
    amount: number;
    supplier: { id: string; name: string } | null;
  }[];
  totalBudget: number | null;
  campaign?: {
    id: string;
    brief: string | null;
    client: {
      id: string;
      name: string;
      industry: string | null;
      initials: string;
      colour: string;
      bgColour: string;
    };
  };
  outreaches?: {
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
}

const tabs = ["Phases", "Outreach", "Contacts", "Suppliers", "Budget", "Coverage"] as const;
type Tab = (typeof tabs)[number];

export function CampaignTabs({
  phases,
  campaignContacts,
  campaignId,
  campaignType,
  availableContacts,
  campaignSuppliers,
  availableSuppliers,
  budgetLineItems,
  totalBudget,
  campaign,
  outreaches,
}: CampaignTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Phases");
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleUpdatePhase(phaseId: string, status: string) {
    startTransition(async () => {
      await updatePhaseStatus(phaseId, status);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border-custom)",
          marginBottom: 16,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 500,
              color:
                activeTab === tab
                  ? "var(--accent-custom)"
                  : "var(--text-muted-custom)",
              backgroundColor: "transparent",
              border: "none",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--accent-custom)"
                  : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 150ms ease, border-color 150ms ease",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Phases" && (
        <CampaignPhaseList
          phases={phases}
          campaignType="simple"
          onUpdatePhase={handleUpdatePhase}
        />
      )}

      {activeTab === "Outreach" && campaign && (
        <DraftPitchesPhase
          campaign={campaign}
          campaignContacts={campaignContacts}
          availableContacts={availableContacts}
          outreaches={outreaches ?? []}
        />
      )}

      {activeTab === "Contacts" && (
        <CampaignContactsTab
          campaignContacts={campaignContacts}
          campaignId={campaignId}
          availableContacts={availableContacts}
        />
      )}

      {activeTab === "Suppliers" && (
        <CampaignSuppliersTab
          campaignSuppliers={campaignSuppliers}
          campaignId={campaignId}
          availableSuppliers={availableSuppliers}
        />
      )}

      {activeTab === "Budget" && (
        <CampaignBudget
          lineItems={budgetLineItems}
          campaignId={campaignId}
          totalBudget={totalBudget}
        />
      )}

      {activeTab === "Coverage" && (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          Coming in Phase 6
        </div>
      )}
    </div>
  );
}
