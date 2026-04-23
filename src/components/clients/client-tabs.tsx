"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { CampaignCard } from "@/components/clients/campaign-card";
import { ContactAvatar } from "@/components/shared/contact-avatar";
import {
  ClientContactForm,
  type ClientContactFormContact,
} from "@/components/clients/client-contact-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteClientContact } from "@/actions/client-actions";
import { titleCase } from "@/lib/format/title-case";

interface Contact {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  photo?: string | null;
  outlet: string | null;
  beat: string | null;
  tier: string | null;
  health: string;
}

interface CampaignContact {
  id: string;
  contact: Contact;
}

interface ClientOutreach {
  id: string;
  subject: string;
  status: string;
  createdAt: Date;
  contact: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    photo: string | null;
    outlet: string | null;
  };
}

interface Campaign {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: string;
  dueDate: Date | null;
  campaignContacts: CampaignContact[];
  outreaches: ClientOutreach[];
  coverages: { id: string }[];
}

const STATUS_BADGE_VARIANT: Record<string, BadgeVariant> = {
  draft: "draft",
  approved: "outreach",
  sent: "active",
  replied: "warm",
};

interface ClientTabsProps {
  clientId: string;
  campaigns: Campaign[];
  clientContacts: ClientContactFormContact[];
}

const tabs = ["Campaigns", "People", "Contacts", "Outreach", "Coverage"] as const;
type Tab = (typeof tabs)[number];

const tierVariantMap: Record<string, BadgeVariant> = {
  "tier-1": "accent",
  "tier-2": "outreach",
  "tier-3": "default",
};

const healthVariantMap: Record<string, BadgeVariant> = {
  warm: "warm",
  cool: "cool",
  hot: "active",
};

export function ClientTabs({ clientId, campaigns, clientContacts }: ClientTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Campaigns");
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] =
    useState<ClientContactFormContact | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ClientContactFormContact | null>(null);
  const [isDeleting, startDelete] = useTransition();

  function openAddContact() {
    setEditingContact(null);
    setContactModalOpen(true);
  }

  function openEditContact(contact: ClientContactFormContact) {
    setEditingContact(contact);
    setContactModalOpen(true);
  }

  function handleContactSuccess() {
    setContactModalOpen(false);
    setEditingContact(null);
    router.refresh();
  }

  function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    startDelete(async () => {
      const res = await deleteClientContact(target.id);
      if ("error" in res) {
        // Surface in alert as a last resort — form-level error UI is for the form
        alert(res.error);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    });
  }

  // Deduplicate contacts across all campaigns
  const contactMap = new Map<string, Contact>();
  for (const campaign of campaigns) {
    for (const cc of campaign.campaignContacts) {
      if (!contactMap.has(cc.contact.id)) {
        contactMap.set(cc.contact.id, cc.contact);
      }
    }
  }
  const contacts = Array.from(contactMap.values());

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border-custom)",
          marginBottom: 20,
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 16px",
                fontSize: 12,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: isActive
                  ? "var(--accent-custom)"
                  : "var(--text-muted-custom)",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--accent-custom)"
                  : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
                transition: "color 150ms ease, border-color 150ms ease",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "Campaigns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {campaigns.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No campaigns yet
            </div>
          ) : (
            campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))
          )}
        </div>
      )}

      {activeTab === "People" && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Button
              variant="default"
              size="sm"
              icon="plus"
              onClick={openAddContact}
            >
              Add key contact
            </Button>
          </div>
          {clientContacts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No key contacts yet. Add the main person you liaise with at this
              client.
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              {clientContacts.map((contact) => (
                <div
                  key={contact.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--border-custom)",
                    backgroundColor: "var(--card-bg)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {contact.name}
                      </div>
                      {contact.role && (
                        <div
                          style={{ fontSize: 12, color: "var(--text-sub)" }}
                        >
                          {contact.role}
                        </div>
                      )}
                      {contact.isPrimary && (
                        <Badge variant="accent">Primary</Badge>
                      )}
                    </div>
                    {(contact.email || contact.phone) && (
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                          marginTop: 4,
                        }}
                      >
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            style={{
                              fontSize: 12,
                              color: "var(--text-primary)",
                              textDecoration: "none",
                            }}
                          >
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-primary)",
                            }}
                          >
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    )}
                    {contact.notes && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-sub)",
                          marginTop: 4,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {contact.notes}
                      </div>
                    )}
                  </div>
                  <div
                    style={{ display: "flex", gap: 4, flexShrink: 0 }}
                  >
                    <Button
                      variant="ghost"
                      size="xs"
                      icon="edit"
                      onClick={() => openEditContact(contact)}
                    />
                    <Button
                      variant="ghost"
                      size="xs"
                      icon="close"
                      onClick={() => setDeleteTarget(contact)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "Contacts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {contacts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No contacts yet
            </div>
          ) : (
            contacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  transition: "background-color 150ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "transparent";
                }}
              >
                <ContactAvatar contact={contact} size={30} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      lineHeight: 1.3,
                    }}
                  >
                    {contact.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted-custom)",
                      lineHeight: 1.3,
                    }}
                  >
                    {contact.outlet}
                  </div>
                </div>
                <Badge variant={tierVariantMap[contact.tier ?? ""] ?? "default"}>
                  {contact.tier ?? "—"}
                </Badge>
                <Badge variant={healthVariantMap[contact.health] ?? "default"}>
                  {titleCase(contact.health)}
                </Badge>
                <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "Outreach" && (() => {
        const rows = campaigns.flatMap((c) =>
          c.outreaches.map((o) => ({ ...o, campaign: { id: c.id, slug: c.slug, name: c.name } })),
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (rows.length === 0) {
          return (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No outreach yet. View and send outreach in each campaign's Outreach tab.
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-[8px]">
            {rows.map((o) => (
              <Link
                key={o.id}
                href={`/campaigns/${o.campaign.slug}?tab=outreach`}
                className="block rounded-[10px] p-3 transition-colors"
                style={{
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--card-bg)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-mid)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-custom)";
                }}
              >
                <div className="flex items-center gap-[8px]">
                  <ContactAvatar contact={o.contact} size={28} />
                  <span className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {o.contact.name}
                  </span>
                  {o.contact.outlet && (
                    <span className="text-[12px] truncate shrink-0" style={{ color: "var(--text-sub)" }}>
                      {o.contact.outlet}
                    </span>
                  )}
                  <div className="ml-auto shrink-0">
                    <Badge variant={STATUS_BADGE_VARIANT[o.status] ?? "default"}>{titleCase(o.status)}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-[8px] mt-[6px]">
                  <span className="text-[12px] shrink-0" style={{ color: "var(--text-sub)" }}>
                    {o.campaign.name}
                  </span>
                  <span className="text-[13px] truncate" style={{ color: "var(--text-primary)" }}>
                    {o.subject}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        );
      })()}

      {activeTab === "Coverage" && (() => {
        const totalCoverages = campaigns.reduce((sum, c) => sum + c.coverages.length, 0);
        if (totalCoverages === 0) {
          return (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted-custom)",
                fontSize: 13,
              }}
            >
              No coverage yet. Log coverage in each campaign's Coverage tab.
            </div>
          );
        }
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted-custom)" }}>Total Coverage Entries</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{totalCoverages}</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted-custom)" }}>
              View and log coverage in each campaign's Coverage tab.
            </div>
          </div>
        );
      })()}

      <ClientContactForm
        open={contactModalOpen}
        clientId={clientId}
        clientContact={editingContact}
        onClose={() => {
          setContactModalOpen(false);
          setEditingContact(null);
        }}
        onSuccess={handleContactSuccess}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Delete key contact?"
          body={`Remove ${deleteTarget.name} from this client's key contacts. This can't be undone.`}
          confirmLabel="Delete"
          isPending={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => {
            if (!isDeleting) setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
