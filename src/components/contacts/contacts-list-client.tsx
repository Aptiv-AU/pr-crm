"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/shared/stats-bar";
import { FilterPills } from "@/components/shared/filter-pills";
import { ContactTable } from "@/components/contacts/contact-table";
import { ContactCardList } from "@/components/contacts/contact-card-list";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { ContactForm } from "@/components/contacts/contact-form";

interface ContactRow {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  publication: string;
  beat: string;
  tier: string;
  health: string;
  createdAt: string;
}

interface ContactsListClientProps {
  contacts: ContactRow[];
  stats: { total: number; aList: number; warm: number };
  beats: string[];
}

export function ContactsListClient({ contacts, stats, beats }: ContactsListClientProps) {
  const router = useRouter();
  const [selectedBeat, setSelectedBeat] = useState("All");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    if (selectedBeat === "All") return contacts;
    return contacts.filter((c) => c.beat === selectedBeat);
  }, [contacts, selectedBeat]);

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header row */}
      <div className="flex items-center justify-end" style={{ marginBottom: 16 }}>
        <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
          Add contact
        </Button>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 16 }}>
        <StatsBar
          stats={[
            { value: stats.total, label: "Total contacts" },
            { value: stats.aList, label: "A-list" },
            { value: stats.warm, label: "Warm" },
            { value: beats.length - 1, label: "Beats" },
          ]}
        />
      </div>

      {/* Filter pills */}
      <div style={{ marginBottom: 12 }}>
        <FilterPills options={beats} selected={selectedBeat} onChange={setSelectedBeat} />
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block">
        <ContactTable contacts={filtered} />
      </div>

      {/* Card list — mobile */}
      <div className="md:hidden">
        <ContactCardList contacts={filtered} />
      </div>

      {/* Add contact slide-over */}
      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Contact">
        {addOpen && <ContactForm onSuccess={handleSuccess} />}
      </SlideOverPanel>
    </div>
  );
}
