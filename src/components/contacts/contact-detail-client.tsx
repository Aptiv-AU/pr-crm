"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactHero } from "@/components/contacts/contact-hero";
import { ContactTabs } from "@/components/contacts/contact-tabs";
import { ContactInfoSidebar } from "@/components/contacts/contact-info-sidebar";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ContactForm } from "@/components/contacts/contact-form";
import { TagPicker } from "@/components/contacts/tag-picker";

interface ContactDetailClientProps {
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    outlet: string;
    beat: string;
    tier: string;
    health: string;
    initials: string;
    avatarBg: string;
    avatarFg: string;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
    notes: string | null;
    interactions: { id: string; type: string; date: string; summary: string | null }[];
    outreaches: { id: string; subject: string; status: string; createdAt: string }[];
    coverages: { id: string; publication: string; date: string; type: string; mediaValue: any }[];
    campaignContacts: {
      id: string;
      status: string;
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
    }[];
  };
  stats: {
    coverageCount: number;
    replyRate: number;
    campaignCount: number;
  };
  assignedTags?: { id: string; label: string; colorBg: string; colorFg: string }[];
  availableTags?: { id: string; label: string; colorBg: string; colorFg: string }[];
}

export function ContactDetailClient({
  contact,
  stats,
  assignedTags = [],
  availableTags = [],
}: ContactDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  function handleEditSuccess() {
    setEditOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Left column */}
        <div className="flex-1 flex flex-col gap-4">
          <ContactHero
            contact={contact}
            stats={stats}
            onEdit={() => setEditOpen(true)}
          />
          <ContactTabs
            interactions={contact.interactions}
            outreaches={contact.outreaches}
            coverages={contact.coverages}
            notes={contact.notes}
          />
        </div>

        {/* Right column */}
        <div className="w-full md:w-[300px] flex flex-col gap-4">
          <ContactInfoSidebar contact={contact} />
          <div
            style={{
              padding: 12,
              border: "1px solid var(--border-custom)",
              borderRadius: 8,
              backgroundColor: "var(--card-bg)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-primary)" }}>
              Tags
            </div>
            <TagPicker
              contactId={contact.id}
              assigned={assignedTags}
              available={availableTags}
            />
          </div>
        </div>
      </div>

      <SlideOverPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Contact"
      >
        <ContactForm contact={contact} onSuccess={handleEditSuccess} />
      </SlideOverPanel>
    </>
  );
}
