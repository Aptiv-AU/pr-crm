"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrUpdateEventDetail } from "@/actions/event-actions";
import { EventHero } from "./event-hero";
import { RunsheetEditor } from "./runsheet-editor";
import { GuestList } from "./guest-list";
import { EventInfoSidebar } from "./event-info-sidebar";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { Button } from "@/components/ui/button";

interface EventDetailClientProps {
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
  eventDetail: {
    id: string;
    venue: string | null;
    eventDate: string | null;
    eventTime: string | null;
    guestCount: number | null;
  };
  runsheetEntries: {
    id: string;
    time: string;
    endTime: string | null;
    activity: string;
    assignee: string | null;
    location: string | null;
    notes: string | null;
    order: number;
  }[];
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
      outlet: string | null;
      email: string | null;
    };
  }[];
  availableContacts: {
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    outlet: string | null;
  }[];
  campaignSuppliers: {
    id: string;
    role: string | null;
    agreedCost: number | null;
    supplier: {
      id: string;
      name: string;
      serviceCategory: string | null;
    };
  }[];
}

type Tab = "Runsheet" | "Guest List";

export function EventDetailClient({
  campaign,
  eventDetail,
  runsheetEntries,
  campaignContacts,
  availableContacts,
  campaignSuppliers,
}: EventDetailClientProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Runsheet");
  const [isPending, startTransition] = useTransition();

  const tabs: Tab[] = ["Runsheet", "Guest List"];

  function handleEditSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createOrUpdateEventDetail(campaign.id, fd);
      setEditOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <EventHero
            campaign={campaign}
            eventDetail={eventDetail}
            onEdit={() => setEditOpen(true)}
          />

          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: 0,
              borderBottom: "1px solid var(--border-custom)",
              marginTop: 16,
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
          {activeTab === "Runsheet" && (
            <RunsheetEditor
              eventDetailId={eventDetail.id}
              entries={runsheetEntries}
            />
          )}

          {activeTab === "Guest List" && (
            <GuestList
              campaignId={campaign.id}
              campaignContacts={campaignContacts}
              availableContacts={availableContacts}
            />
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-full md:w-[300px] shrink-0">
          <EventInfoSidebar
            eventDetail={eventDetail}
            campaignSuppliers={campaignSuppliers}
          />
        </div>
      </div>

      {/* Edit Event Details slide-over */}
      <SlideOverPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Event Details"
      >
        {editOpen && (
          <form onSubmit={handleEditSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label
                style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)", display: "block", marginBottom: 4 }}
              >
                Venue
              </label>
              <input
                name="venue"
                type="text"
                defaultValue={eventDetail.venue ?? ""}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 13,
                  borderRadius: 7,
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--page-bg)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)", display: "block", marginBottom: 4 }}
              >
                Event Date
              </label>
              <input
                name="eventDate"
                type="date"
                defaultValue={
                  eventDetail.eventDate
                    ? new Date(eventDetail.eventDate).toISOString().split("T")[0]
                    : ""
                }
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 13,
                  borderRadius: 7,
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--page-bg)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)", display: "block", marginBottom: 4 }}
              >
                Event Time
              </label>
              <input
                name="eventTime"
                type="time"
                defaultValue={eventDetail.eventTime ?? ""}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 13,
                  borderRadius: 7,
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--page-bg)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label
                style={{ fontSize: 12, fontWeight: 500, color: "var(--text-sub)", display: "block", marginBottom: 4 }}
              >
                Expected Guest Count
              </label>
              <input
                name="guestCount"
                type="number"
                min={0}
                defaultValue={eventDetail.guestCount ?? ""}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 13,
                  borderRadius: 7,
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--page-bg)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isPending}
              style={{ marginTop: 4 }}
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </form>
        )}
      </SlideOverPanel>
    </div>
  );
}
