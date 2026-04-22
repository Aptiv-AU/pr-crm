"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FilterPills } from "@/components/shared/filter-pills";
import { ContactTable } from "@/components/contacts/contact-table";
import { ContactCardList } from "@/components/contacts/contact-card-list";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { ContactForm } from "@/components/contacts/contact-form";
import Link from "next/link";
import { TagChip } from "@/components/contacts/tag-chip";
import { applyFilter, createSegment, deleteSegment } from "@/actions/segment-actions";
import type { SegmentFilter } from "@/lib/segments/filter";

type Tag = { id: string; label: string; colorBg: string; colorFg: string };

interface ContactRow {
  id: string;
  slug: string;
  name: string;
  initials: string;
  avatarBg: string;
  avatarFg: string;
  photo?: string | null;
  outlet: string;
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
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-[1600px] mx-auto space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2
            className="text-4xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Media Contacts
          </h2>
          <p
            className="font-medium italic"
            style={{ color: "var(--text-sub)" }}
          >
            Curating excellence in media relationships.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/contacts/import" className="no-underline">
            <Button variant="default" size="sm">
              Import
            </Button>
          </Link>
          <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
            Add contact
          </Button>
        </div>
      </div>

      {/* Search & filter pill bar */}
      <section
        className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 rounded-full p-2"
        style={{ backgroundColor: "var(--surface-container-low)" }}
      >
        <div
          className="flex-1 flex items-center gap-3 rounded-full px-5 py-2"
          style={{ backgroundColor: "var(--card-bg)" }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ color: "var(--text-muted-custom)" }}>
            <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16ZM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or publication..."
            value={filter.search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex items-center gap-3 px-3 overflow-x-auto whitespace-nowrap">
          <select
            value={filter.outlets?.[0] ?? ""}
            onChange={(e) => setOutlet(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-wider cursor-pointer"
            style={{ color: "var(--text-sub)" }}
          >
            <option value="">All outlets</option>
            {outlets.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <span className="w-px h-4" style={{ backgroundColor: "var(--border-custom)" }} />
          <select
            value={filter.tiers?.[0] ?? ""}
            onChange={(e) => setTier(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-xs font-bold uppercase tracking-wider cursor-pointer"
            style={{ color: "var(--text-sub)" }}
          >
            <option value="">All tiers</option>
            {tiers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {hasFilter && (
            <>
              <span className="w-px h-4" style={{ backgroundColor: "var(--border-custom)" }} />
              <Button variant="default" size="sm" onClick={saveAsSegment}>
                Save segment
              </Button>
              <Button variant="default" size="sm" onClick={clearFilter}>
                Clear
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Tag + saved segment rail */}
      <div className="flex flex-col gap-3">
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

    </div>
  );
}
