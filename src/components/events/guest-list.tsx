"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addContactToCampaign, removeContactFromCampaign } from "@/actions/campaign-actions";
import { updateGuestRsvp } from "@/actions/event-actions";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ContactAvatar } from "@/components/shared/contact-avatar";
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
    outlet: string | null;
    email: string | null;
  };
}

interface AvailableContact {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  photo?: string | null;
  outlet: string | null;
}

interface GuestListProps {
  campaignId: string;
  campaignContacts: CampaignContact[];
  availableContacts: AvailableContact[];
}

const STATUS_DISPLAY: Record<string, string> = {
  added: "Invited",
  invited: "Invited",
  confirmed: "Confirmed",
  declined: "Declined",
  attended: "Attended",
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  added: "default",
  invited: "default",
  confirmed: "active",
  declined: "cool",
  attended: "accent",
};

const RSVP_OPTIONS = ["added", "confirmed", "declined", "attended"] as const;

type FilterStatus = "all" | "added" | "confirmed" | "declined" | "attended";

export function GuestList({ campaignId, campaignContacts, availableContacts }: GuestListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPicker, setShowPicker] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const linkedContactIds = new Set(campaignContacts.map((cc) => cc.contactId));
  const filteredAvailable = availableContacts.filter((c) => !linkedContactIds.has(c.id));

  const filteredGuests =
    filter === "all"
      ? campaignContacts
      : campaignContacts.filter((cc) => cc.status === filter);

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

  function handleStatusChange(campaignContactId: string, newStatus: string) {
    startTransition(async () => {
      await updateGuestRsvp(campaignContactId, newStatus);
      router.refresh();
    });
  }

  const filterPills: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Invited", value: "added" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Declined", value: "declined" },
    { label: "Attended", value: "attended" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          Guest List ({campaignContacts.length})
        </span>
        <Button
          variant="default"
          size="sm"
          icon="plus"
          onClick={() => setShowPicker(!showPicker)}
        >
          Add guest
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
                <ContactAvatar contact={contact} size={22} />
                <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{contact.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-sub)" }}>{contact.outlet || ""}</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {filterPills.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setFilter(pill.value)}
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 12,
              border: "1px solid var(--border-custom)",
              backgroundColor: filter === pill.value ? "var(--accent-custom)" : "var(--card-bg)",
              color: filter === pill.value ? "#fff" : "var(--text-sub)",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Guest list */}
      {filteredGuests.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "30px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          {campaignContacts.length === 0
            ? "No guests added yet"
            : "No guests match this filter"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {filteredGuests.map((cc) => (
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
              <ContactAvatar contact={cc.contact} size={26} />
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
                  {cc.contact.outlet || "\u2014"}
                </div>
                {cc.contact.email && (
                  <div style={{ fontSize: 12, color: "var(--text-muted-custom)" }}>
                    {cc.contact.email}
                  </div>
                )}
              </div>

              {/* RSVP badge */}
              <Badge variant={STATUS_VARIANT[cc.status] ?? "default"}>
                {STATUS_DISPLAY[cc.status] ?? cc.status}
              </Badge>

              {/* Status select */}
              <select
                value={cc.status}
                onChange={(e) => handleStatusChange(cc.id, e.target.value)}
                disabled={isPending}
                style={{
                  fontSize: 11,
                  padding: "2px 4px",
                  borderRadius: 4,
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-sub)",
                  cursor: "pointer",
                }}
              >
                {RSVP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {STATUS_DISPLAY[opt]}
                  </option>
                ))}
              </select>

              {/* Remove */}
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
