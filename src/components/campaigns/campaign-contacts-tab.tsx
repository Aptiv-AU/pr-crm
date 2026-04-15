"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addContactToCampaign, removeContactFromCampaign } from "@/actions/campaign-actions";
import { ContactAvatar } from "@/components/shared/contact-avatar";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface CampaignContact {
  id: string;
  contactId: string;
  status: string;
  contact: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    photo?: string | null;
    publication: string | null;
    tier: string | null;
    health: string | null;
  };
}

interface AvailableContact {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  photo?: string | null;
  publication: string | null;
}

interface CampaignContactsTabProps {
  campaignContacts: CampaignContact[];
  campaignId: string;
  availableContacts: AvailableContact[];
}

const contactStatusVariant: Record<string, BadgeVariant> = {
  added: "default",
  pitched: "accent",
  replied: "active",
  covered: "active",
};

export function CampaignContactsTab({
  campaignContacts,
  campaignId,
  availableContacts,
}: CampaignContactsTabProps) {
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  const linkedContactIds = new Set(campaignContacts.map((cc) => cc.contactId));
  const filteredAvailable = availableContacts.filter((c) => !linkedContactIds.has(c.id));

  function handleAdd(contactId: string) {
    startTransition(async () => {
      await addContactToCampaign(campaignId, contactId);
      setShowPicker(false);
      router.refresh();
    });
  }

  function handleRemove(campaignContactId: string) {
    startTransition(async () => {
      await removeContactFromCampaign(campaignContactId);
      router.refresh();
    });
  }

  return (
    <div>
      {/* Add button */}
      <div style={{ marginBottom: 12 }}>
        <Button
          variant="ghost"
          size="sm"
          icon="plus"
          onClick={() => setShowPicker(!showPicker)}
        >
          Add contact
        </Button>
      </div>

      {/* Available contacts picker */}
      {showPicker && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 8,
            border: "1px solid var(--border-custom)",
            backgroundColor: "var(--page-bg)",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {filteredAvailable.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--text-muted-custom)", padding: "8px 4px" }}>
              No more contacts to add
            </div>
          ) : (
            filteredAvailable.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleAdd(contact.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 4px",
                  cursor: "pointer",
                  borderRadius: 6,
                  opacity: isPending ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <ContactAvatar contact={contact} size={28} />
                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{contact.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-sub)" }}>{contact.publication || ""}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Linked contacts list */}
      {campaignContacts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "30px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          No contacts added yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {campaignContacts.map((cc) => (
            <div
              key={cc.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid var(--border-custom)",
                opacity: isPending ? 0.6 : 1,
              }}
            >
              <ContactAvatar contact={cc.contact} size={28} />
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
                  {cc.contact.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                  {cc.contact.publication || "\u2014"}
                </div>
              </div>
              <Badge variant={contactStatusVariant[cc.status] ?? "default"}>{cc.status}</Badge>
              <button
                onClick={() => handleRemove(cc.id)}
                disabled={isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--text-muted-custom)",
                  cursor: "pointer",
                  borderRadius: 4,
                  flexShrink: 0,
                }}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
