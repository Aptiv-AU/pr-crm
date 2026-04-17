"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/shared/stats-bar";
import { FilterPills } from "@/components/shared/filter-pills";
import { ContactTable } from "@/components/contacts/contact-table";
import { ContactCardList } from "@/components/contacts/contact-card-list";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { ContactForm } from "@/components/contacts/contact-form";
import { ImportContactsModal } from "@/components/contacts/import-contacts-modal";
import { TagChip } from "@/components/contacts/tag-chip";
import { applyFilter, createSegment, deleteSegment } from "@/actions/segment-actions";
import type { SegmentFilter } from "@/lib/segments/filter";

type Tag = { id: string; label: string; colorBg: string; colorFg: string };

interface ContactRow {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  photo?: string | null;
  publication: string;
  beat: string;
  tier: string;
  health: string;
  createdAt: string;
  lastContactDate: string | null;
  tags?: Tag[];
}

interface Segment {
  id: string;
  name: string;
  filter: object;
}

interface ContactsListClientProps {
  contacts: ContactRow[];
  stats: { total: number; aList: number; warm: number };
  beats: string[];
  tags: Tag[];
  outlets: string[];
  tiers: string[];
  segments: Segment[];
}

export function ContactsListClient({
  contacts,
  stats,
  beats,
  tags,
  outlets,
  tiers,
  segments,
}: ContactsListClientProps) {
  const router = useRouter();
  const [selectedBeat, setSelectedBeat] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Segment filter state
  const [filter, setFilter] = useState<SegmentFilter>({});
  const [filterActive, setFilterActive] = useState(false);
  const [filtered, setFiltered] = useState<ContactRow[]>(contacts);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!filterActive) return;
    startTransition(async () => {
      const rows = await applyFilter(filter);
      setFiltered(rows as ContactRow[]);
    });
  }, [filter, filterActive]);

  const beatFiltered = useMemo(() => {
    const base = filterActive ? filtered : contacts;
    if (selectedBeat === "All") return base;
    return base.filter((c) => c.beat === selectedBeat);
  }, [contacts, filtered, filterActive, selectedBeat]);

  function toggleTag(tagId: string) {
    const current = filter.tagIds ?? [];
    const next = current.includes(tagId)
      ? current.filter((t) => t !== tagId)
      : [...current, tagId];
    setFilter({ ...filter, tagIds: next.length ? next : undefined });
    setFilterActive(true);
  }

  function setSearch(v: string) {
    setFilter({ ...filter, search: v || undefined });
    setFilterActive(true);
  }

  function setOutlet(v: string) {
    setFilter({ ...filter, outlets: v ? [v] : undefined });
    setFilterActive(true);
  }

  function setTier(v: string) {
    setFilter({ ...filter, tiers: v ? [v] : undefined });
    setFilterActive(true);
  }

  function clearFilter() {
    setFilter({});
    setFilterActive(false);
    setFiltered(contacts);
  }

  async function saveAsSegment() {
    const name = window.prompt("Segment name?");
    if (!name) return;
    const res = await createSegment(name, filter);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  function loadSegment(s: Segment) {
    setFilter(s.filter as SegmentFilter);
    setFilterActive(true);
  }

  async function removeSegment(id: string) {
    if (!window.confirm("Delete this segment?")) return;
    await deleteSegment(id);
    router.refresh();
  }

  function handleSuccess() {
    setAddOpen(false);
    router.refresh();
  }

  const hasFilter =
    filterActive &&
    ((filter.tagIds?.length ?? 0) > 0 ||
      (filter.outlets?.length ?? 0) > 0 ||
      (filter.tiers?.length ?? 0) > 0 ||
      !!filter.search?.trim());

  return (
    <div className="p-4 md:p-6">
      {/* Header row */}
      <div className="flex items-center justify-end gap-2" style={{ marginBottom: 16 }}>
        <Button variant="default" size="sm" onClick={() => setImportOpen(true)}>
          Import
        </Button>
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

      {/* Segment filter bar */}
      <div
        style={{
          marginBottom: 12,
          padding: 12,
          border: "1px solid var(--border-custom)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search name, email, outlet…"
            value={filter.search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            style={{ flex: 1, minWidth: 200 }}
          />
          <select
            value={filter.outlets?.[0] ?? ""}
            onChange={(e) => setOutlet(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All outlets</option>
            {outlets.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select
            value={filter.tiers?.[0] ?? ""}
            onChange={(e) => setTier(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All tiers</option>
            {tiers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {hasFilter && (
            <>
              <Button variant="default" size="sm" onClick={saveAsSegment}>
                Save as segment
              </Button>
              <Button variant="default" size="sm" onClick={clearFilter}>
                Clear
              </Button>
            </>
          )}
        </div>
        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {tags.map((t) => {
              const active = (filter.tagIds ?? []).includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  style={{ opacity: active ? 1 : 0.5 }}
                >
                  <TagChip label={t.label} bg={t.colorBg} fg={t.colorFg} />
                </button>
              );
            })}
          </div>
        )}
        {segments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-sub)" }}>Saved:</span>
            {segments.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  border: "1px solid var(--border-custom)",
                  borderRadius: 12,
                  padding: "2px 8px",
                  fontSize: 12,
                }}
              >
                <button onClick={() => loadSegment(s)}>{s.name}</button>
                <button
                  onClick={() => removeSegment(s.id)}
                  style={{ color: "var(--text-sub)" }}
                  title="Delete segment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter pills (beat) */}
      <div style={{ marginBottom: 12 }}>
        <FilterPills options={beats} selected={selectedBeat} onChange={setSelectedBeat} />
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block">
        {beatFiltered.length > 0 ? (
          <ContactTable contacts={beatFiltered} />
        ) : contacts.length > 0 ? (
          <EmptyState icon="contacts" title="No contacts match this filter" description="Try a different filter." />
        ) : (
          <EmptyState icon="contacts" title="No contacts yet" description="Add your first media contact to get started." />
        )}
      </div>

      {/* Card list — mobile */}
      <div className="md:hidden">
        {beatFiltered.length > 0 ? (
          <ContactCardList contacts={beatFiltered} />
        ) : contacts.length > 0 ? (
          <EmptyState icon="contacts" title="No contacts match this filter" description="Try a different filter." />
        ) : (
          <EmptyState icon="contacts" title="No contacts yet" description="Add your first media contact to get started." />
        )}
      </div>

      {/* Add contact slide-over */}
      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Contact">
        {addOpen && <ContactForm onSuccess={handleSuccess} />}
      </SlideOverPanel>

      <ImportContactsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => router.refresh()}
      />
    </div>
  );
}
