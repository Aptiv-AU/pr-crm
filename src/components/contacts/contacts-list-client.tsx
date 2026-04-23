"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { FilterPills } from "@/components/shared/filter-pills";
import { ContactTable } from "@/components/contacts/contact-table";
import { ContactCardList } from "@/components/contacts/contact-card-list";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { EmptyState } from "@/components/shared/empty-state";
import { ContactForm } from "@/components/contacts/contact-form";
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

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diffMs / day);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
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

  const outletCount = useMemo(() => {
    return new Set(contacts.map((c) => c.outlet).filter(Boolean)).size;
  }, [contacts]);

  const lastImport = useMemo(() => {
    if (contacts.length === 0) return "—";
    const latest = contacts.reduce<string | null>((acc, c) => {
      if (!acc) return c.createdAt;
      return new Date(c.createdAt) > new Date(acc) ? c.createdAt : acc;
    }, null);
    return formatRelative(latest);
  }, [contacts]);

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

  void outlets;
  void tiers;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Directory"
        title="Contacts"
        subtitle={`${stats.total} journalists across ${outletCount} outlets.`}
        meta={[
          { label: "Tier A", value: String(stats.aList) },
          { label: "Warm", value: String(stats.warm) },
          { label: "Last import", value: lastImport },
        ]}
        actions={
          <>
            <Link href="/contacts/import" className="no-underline">
              <Button variant="outline" size="sm" icon="filter">
                Import
              </Button>
            </Link>
            <Button variant="primary" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
              Add contact
            </Button>
          </>
        }
      />

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            flex: 1,
            minWidth: 240,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 14px",
            height: 38,
            borderRadius: 999,
            background: "var(--surface-container-low)",
          }}
        >
          <Icon name="search" size={13} color="var(--text-muted-custom)" />
          <input
            type="text"
            placeholder="Search by name, outlet, beat…"
            value={filter.search ?? ""}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          />
        </div>
        <Badge variant="tierA">A-list · {stats.aList}</Badge>
        <Badge variant="warm">Warm · {stats.warm}</Badge>
      </div>

      {(tags.length > 0 || segments.length > 0 || hasFilter) && (
        <div className="flex flex-col gap-3">
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {tags.map((t) => {
                const active = (filter.tagIds ?? []).includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTag(t.id)}
                    style={{ opacity: active ? 1 : 0.5, background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
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
                  <button
                    onClick={() => loadSegment(s)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}
                  >
                    {s.name}
                  </button>
                  <button
                    onClick={() => removeSegment(s.id)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-sub)" }}
                    title="Delete segment"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {hasFilter && (
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="default" size="sm" onClick={saveAsSegment}>
                Save segment
              </Button>
              <Button variant="default" size="sm" onClick={clearFilter}>
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      <FilterPills options={beats} selected={selectedBeat} onChange={setSelectedBeat} />

      <div className="hidden md:block">
        {beatFiltered.length > 0 ? (
          <ContactTable contacts={beatFiltered} />
        ) : contacts.length > 0 ? (
          <EmptyState icon="contacts" title="No contacts match this filter" description="Try a different filter." />
        ) : (
          <EmptyState icon="contacts" title="No contacts yet" description="Add your first media contact to get started." />
        )}
      </div>

      <div className="md:hidden">
        {beatFiltered.length > 0 ? (
          <ContactCardList contacts={beatFiltered} />
        ) : contacts.length > 0 ? (
          <EmptyState icon="contacts" title="No contacts match this filter" description="Try a different filter." />
        ) : (
          <EmptyState icon="contacts" title="No contacts yet" description="Add your first media contact to get started." />
        )}
      </div>

      <SlideOverPanel open={addOpen} onClose={() => setAddOpen(false)} title="Add Contact">
        {addOpen && <ContactForm onSuccess={handleSuccess} />}
      </SlideOverPanel>
    </PageContainer>
  );
}
