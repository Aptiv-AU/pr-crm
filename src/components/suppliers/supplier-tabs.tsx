"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { SupplierContactForm } from "@/components/suppliers/supplier-contact-form";
import { titleCase } from "@/lib/format/title-case";

interface SupplierContact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
}

interface CampaignSupplier {
  id: string;
  role: string | null;
  status: string;
  agreedCost: number | string | null;
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

interface BudgetLineItem {
  id: string;
  description: string;
  amount: number | string;
  campaign: {
    id: string;
    name: string;
  };
}

interface SupplierTabsProps {
  supplierId: string;
  supplierContacts: SupplierContact[];
  campaignSuppliers: CampaignSupplier[];
  budgetLineItems: BudgetLineItem[];
}

const tabs = ["People", "Campaigns", "Cost History"] as const;
type Tab = (typeof tabs)[number];

const campaignSupplierStatusVariantMap: Record<string, BadgeVariant> = {
  pending: "draft",
  confirmed: "active",
  cancelled: "cool",
};

function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return "\u2014";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "\u2014";
  return `$${num.toLocaleString("en-US")}`;
}

export function SupplierTabs({
  supplierId,
  supplierContacts,
  campaignSuppliers,
  budgetLineItems,
}: SupplierTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("People");
  const [contactPanelOpen, setContactPanelOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<SupplierContact | null>(null);

  function handleContactSuccess() {
    setContactPanelOpen(false);
    setEditingContact(null);
    router.refresh();
  }

  function openAddContact() {
    setEditingContact(null);
    setContactPanelOpen(true);
  }

  function openEditContact(contact: SupplierContact) {
    setEditingContact(contact);
    setContactPanelOpen(true);
  }

  const totalCost = budgetLineItems.reduce((sum, item) => {
    const num = typeof item.amount === "string" ? parseFloat(item.amount) : Number(item.amount);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

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

      {/* People tab */}
      {activeTab === "People" && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Button variant="default" size="sm" icon="plus" onClick={openAddContact}>
              Add person
            </Button>
          </div>
          {supplierContacts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No people added yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {supplierContacts.map((contact) => (
                <div
                  key={contact.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--text-primary)",
                      }}
                    >
                      {contact.name}
                    </div>
                    {contact.role && (
                      <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                        {contact.role}
                      </div>
                    )}
                    {contact.email && (
                      <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 1 }}>
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 1 }}>
                        {contact.phone}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    icon="edit"
                    onClick={() => openEditContact(contact)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaigns tab */}
      {activeTab === "Campaigns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaignSuppliers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              Not linked to any campaigns yet
            </div>
          ) : (
            campaignSuppliers.map((cs) => (
              <div
                key={cs.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    backgroundColor: cs.campaign.client.bgColour,
                    color: cs.campaign.client.colour,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {cs.campaign.client.initials}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-primary)",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cs.campaign.name}
                </div>
                {cs.role && (
                  <div style={{ fontSize: 12, color: "var(--text-sub)", flexShrink: 0 }}>
                    {cs.role}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--text-sub)", flexShrink: 0 }}>
                  {formatCurrency(cs.agreedCost)}
                </div>
                <Badge variant={campaignSupplierStatusVariantMap[cs.status] ?? "default"}>
                  {titleCase(cs.status)}
                </Badge>
              </div>
            ))
          )}
        </div>
      )}

      {/* Cost History tab */}
      {activeTab === "Cost History" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {budgetLineItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No costs recorded
            </div>
          ) : (
            <>
              {budgetLineItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.description}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 1 }}>
                      {item.campaign.name}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      flexShrink: 0,
                    }}
                  >
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
              {/* Total row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderTop: "1px solid var(--border-custom)",
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Total
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {formatCurrency(totalCost)}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Contact slide-over */}
      <SlideOverPanel
        open={contactPanelOpen}
        onClose={() => {
          setContactPanelOpen(false);
          setEditingContact(null);
        }}
        title={editingContact ? "Edit Person" : "Add Person"}
      >
        {contactPanelOpen && (
          <SupplierContactForm
            supplierId={supplierId}
            supplierContact={editingContact}
            onSuccess={handleContactSuccess}
          />
        )}
      </SlideOverPanel>
    </div>
  );
}
