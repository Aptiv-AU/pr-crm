"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactHero } from "@/components/contacts/contact-hero";
import { ContactTabs } from "@/components/contacts/contact-tabs";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ContactForm } from "@/components/contacts/contact-form";

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
    title?: string | null;
    city?: string | null;
    interactions: { id: string; type: string; date: string; summary: string | null }[];
    outreaches: {
      id: string;
      subject: string;
      status: string;
      createdAt: string;
      campaignId: string;
      campaign?: { id: string; name: string } | null;
    }[];
    coverages: {
      id: string;
      publication: string;
      date: string;
      type: string;
      mediaValue: unknown;
      headline?: string | null;
      reach?: number | null;
    }[];
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

export function ContactDetailClient({ contact, stats }: ContactDetailClientProps) {
  const [editOpen, setEditOpen] = useState(false);
  const router = useRouter();

  function handleEditSuccess() {
    setEditOpen(false);
    router.refresh();
  }

  const outreaches = contact.outreaches.map((o) => ({
    id: o.id,
    subject: o.subject,
    status: o.status,
    createdAt: o.createdAt,
    campaignId: o.campaignId,
    campaignName: o.campaign?.name ?? null,
  }));

  const lastInteraction = contact.interactions[0]?.date ?? null;
  const lastContact = lastInteraction
    ? new Date(lastInteraction).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <ContactHero
          contact={contact}
          onEdit={() => setEditOpen(true)}
          onBack={() => router.push("/contacts")}
        />
        <ContactTabs
          contact={contact}
          stats={stats}
          outreaches={outreaches}
          coverages={contact.coverages}
          lastContact={lastContact}
        />
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
