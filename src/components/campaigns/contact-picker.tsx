"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addContactToCampaign, removeContactFromCampaign } from "@/actions/campaign-actions";
import { suggestContacts } from "@/actions/outreach-actions";
import { Button } from "@/components/ui/button";
import { ContactAvatar } from "@/components/shared/contact-avatar";
import { Icon } from "@/components/ui/icon";

interface ContactPickerProps {
  campaignId: string;
  campaignContacts: {
    id: string;
    contactId: string;
    contact: {
      id: string;
      name: string;
      initials: string;
      avatarBg: string;
      avatarFg: string;
      photo?: string | null;
      outlet: string | null;
      beat?: string | null;
      tier?: string | null;
    };
  }[];
  availableContacts: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    photo?: string | null;
    outlet: string | null;
    beat?: string | null;
    tier?: string | null;
  }[];
  outreaches: { contactId: string; status: string }[];
  brief: string | null;
  clientName: string;
  industry: string | null;
}

export function ContactPicker({
  campaignId,
  campaignContacts,
  availableContacts,
  outreaches,
  brief,
  clientName,
  industry,
}: ContactPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownMode, setDropdownMode] = useState<"add" | "suggest">("add");
  const [suggestions, setSuggestions] = useState<{ contactId: string; reason: string }[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const linkedContactIds = new Set(campaignContacts.map((cc) => cc.contactId));
  const filteredAvailable = availableContacts.filter((c) => !linkedContactIds.has(c.id));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  function handleAdd(contactId: string) {
    startTransition(async () => {
      await addContactToCampaign(campaignId, contactId);
      setShowDropdown(false);
      router.refresh();
    });
  }

  function handleRemove(campaignContactId: string) {
    startTransition(async () => {
      await removeContactFromCampaign(campaignContactId);
      router.refresh();
    });
  }

  function handleAddContacts() {
    setDropdownMode("add");
    setSuggestions([]);
    setShowDropdown(!showDropdown);
  }

  async function handleSuggest() {
    setDropdownMode("suggest");
    setSuggestions([]);
    setShowDropdown(true);
    setSuggesting(true);

    const result = await suggestContacts(campaignId);

    if ("suggestions" in result && result.suggestions) {
      setSuggestions(result.suggestions);
    }
    setSuggesting(false);
  }

  function getOutreachStatus(contactId: string) {
    const match = outreaches.find((o) => o.contactId === contactId);
    if (!match) return { label: "No draft", color: "var(--text-muted-custom)", dot: "var(--text-muted-custom)" };
    if (match.status === "draft") return { label: "Draft", color: "var(--amber)", dot: "var(--amber)" };
    if (match.status === "approved") return { label: "Approved", color: "var(--green)", dot: "var(--green)" };
    return { label: match.status, color: "var(--text-muted-custom)", dot: "var(--text-muted-custom)" };
  }

  // Build a lookup for suggested contacts
  const suggestedContactMap = new Map(suggestions.map((s) => [s.contactId, s.reason]));

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", flex: 1 }}>
          Pitch List ({campaignContacts.length})
        </span>
        <Button variant="default" size="xs" icon="plus" onClick={handleAddContacts}>
          Add contacts
        </Button>
        {brief && (
          <Button variant="default" size="xs" icon="sparkle" onClick={handleSuggest} disabled={suggesting}>
            {suggesting ? "Suggesting..." : "Suggest contacts"}
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            marginBottom: 16,
            padding: 10,
            borderRadius: 8,
            border: "1px solid var(--border-custom)",
            backgroundColor: "var(--page-bg)",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          {dropdownMode === "suggest" && suggesting ? (
            <div style={{ fontSize: 12, color: "var(--text-muted-custom)", padding: "8px 4px" }}>
              Suggesting...
            </div>
          ) : dropdownMode === "suggest" && suggestions.length > 0 ? (
            suggestions.map((s) => {
              const contact = filteredAvailable.find((c) => c.id === s.contactId);
              if (!contact) return null;
              return (
                <div
                  key={contact.id}
                  onClick={() => handleAdd(contact.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 4px",
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{contact.name}</span>
                      <span style={{ fontSize: 12, color: "var(--text-sub)" }}>{contact.outlet}</span>
                    </div>
                    <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-sub)", marginTop: 2 }}>
                      {s.reason}
                    </div>
                  </div>
                </div>
              );
            })
          ) : dropdownMode === "add" ? (
            filteredAvailable.length === 0 ? (
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
                  <span style={{ fontSize: 12, color: "var(--text-sub)" }}>{contact.outlet}</span>
                </div>
              ))
            )
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-muted-custom)", padding: "8px 4px" }}>
              No suggestions found
            </div>
          )}
        </div>
      )}

      {/* Selected contacts list */}
      {campaignContacts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted-custom)", fontSize: 13 }}>
          No contacts added yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {campaignContacts.map((cc) => {
            const status = getOutreachStatus(cc.contactId);
            return (
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
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: status.dot,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: 11, color: status.color }}>{status.label}</span>
                </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
