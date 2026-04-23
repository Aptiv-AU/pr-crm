"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { PageContainer } from "@/components/layout/page-header";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { CoverageForm } from "@/components/coverage/coverage-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteCoverage } from "@/actions/coverage-actions";

export interface CoverageView {
  id: string;
  slug: string;
  publication: string;
  date: string;
  createdAt: string;
  type: string;
  url: string | null;
  mediaValue: number | null;
  attachmentUrl: string | null;
  notes: string | null;
  campaignId: string | null;
  contactId: string | null;
  campaign: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
      slug: string;
      initials: string;
      colour: string;
      bgColour: string;
    };
  } | null;
  contact: {
    id: string;
    name: string;
    outlet: string | null;
    beat: string | null;
  } | null;
}

export interface RelatedCoverageView {
  id: string;
  slug: string;
  publication: string;
  headline: string;
  date: string;
  mediaValue: number | null;
}

interface Props {
  coverage: CoverageView;
  related: RelatedCoverageView[];
  campaigns: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
  locale: string;
  currency: string;
  timezone: string;
}

type TabKey = "article" | "analytics" | "distribution" | "related";

const TABS: { k: TabKey; label: string }[] = [
  { k: "article", label: "Article" },
  { k: "analytics", label: "Analytics" },
  { k: "distribution", label: "Distribution" },
  { k: "related", label: "Related" },
];

function sentimentForType(type: string): { label: string; variant: BadgeVariant } {
  // Positive/neutral/negative isn't in the schema; derive a rough pill from
  // the coverage `type` so the header has meaningful chips.
  const t = type.toLowerCase();
  if (t.includes("feature") || t.includes("profile")) {
    return { label: "Feature", variant: "active" };
  }
  if (t.includes("mention")) return { label: "Mention", variant: "cool" };
  if (t.includes("review")) return { label: "Review", variant: "warm" };
  return { label: type.charAt(0).toUpperCase() + type.slice(1), variant: "default" };
}

function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function formatDateTime(iso: string, locale: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatCurrency(cents: number, currency: string, locale: string): string {
  // Stored as decimal dollars already — not cents — matching mediaValue.
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents);
}

function compactValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return String(value);
}

export function CoverageDetailClient({
  coverage,
  related,
  campaigns,
  contacts,
  locale,
  currency,
  timezone,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("article");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hostname = hostnameOf(coverage.url);
  const typeBadge = sentimentForType(coverage.type);

  const formCoverage = {
    id: coverage.id,
    publication: coverage.publication,
    date: coverage.date.split("T")[0],
    type: coverage.type,
    url: coverage.url,
    mediaValue: coverage.mediaValue,
    attachmentUrl: coverage.attachmentUrl,
    notes: coverage.notes,
    campaignId: coverage.campaignId,
    contactId: coverage.contactId,
  };

  async function handleDelete() {
    await deleteCoverage(coverage.id);
    setDeleteOpen(false);
    router.push("/coverage");
  }

  return (
    <PageContainer>
      <Hero
        coverage={coverage}
        hostname={hostname}
        typeBadge={typeBadge}
        locale={locale}
        currency={currency}
        timezone={timezone}
        onEdit={() => setEditOpen(true)}
      />

      <Tabs tab={tab} onChange={setTab} />

      {tab === "article" && (
        <ArticleTab
          coverage={coverage}
          locale={locale}
          onDelete={() => setDeleteOpen(true)}
        />
      )}
      {tab === "analytics" && <AnalyticsTab coverage={coverage} />}
      {tab === "distribution" && (
        <DistributionTab coverage={coverage} locale={locale} timezone={timezone} />
      )}
      {tab === "related" && (
        <RelatedTab related={related} locale={locale} currency={currency} />
      )}

      <SlideOverPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit coverage"
      >
        <CoverageForm
          coverage={formCoverage}
          campaigns={campaigns}
          contacts={contacts}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      </SlideOverPanel>

      {deleteOpen && (
        <ConfirmDialog
          title="Delete this coverage?"
          body="Removes the placement from the campaign. This can't be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
        />
      )}
    </PageContainer>
  );
}

/* ──────────────── Hero ──────────────── */

function Hero({
  coverage,
  hostname,
  typeBadge,
  locale,
  currency,
  timezone,
  onEdit,
}: {
  coverage: CoverageView;
  hostname: string | null;
  typeBadge: { label: string; variant: BadgeVariant };
  locale: string;
  currency: string;
  timezone: string;
  onEdit: () => void;
}) {
  const headline = coverage.notes?.trim() || coverage.publication;
  // Crude excerpt: take first paragraph of notes; fallback to placeholder.
  const excerpt = coverage.notes?.split(/\n{2,}/)[0]?.trim() ?? "";

  const stats: StatItemView[] = [
    {
      label: "Reach",
      value: coverage.mediaValue ? compactValue(coverage.mediaValue * 100) : "—",
    },
    { label: "UVM", value: "—" },
    { label: "Shares", value: "—" },
    { label: "Avg. dwell", value: "—" },
    {
      label: "Media value",
      value: coverage.mediaValue
        ? formatCurrency(coverage.mediaValue, currency, locale)
        : "—",
    },
  ];

  return (
    <Card style={{ padding: "24px 28px 0", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--accent-custom)",
          marginBottom: 12,
        }}
      >
        <span>{coverage.publication}</span>
        {coverage.contact?.beat && (
          <>
            <span style={{ color: "var(--border-mid)" }}>/</span>
            <span style={{ color: "var(--text-muted-custom)" }}>
              {coverage.contact.beat}
            </span>
          </>
        )}
        <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
        {coverage.campaign && (
          <Badge variant="accent">For {coverage.campaign.name}</Badge>
        )}
      </div>

      <h1
        style={{
          fontSize: 36,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.08,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {headline}
      </h1>

      {excerpt && excerpt !== headline && (
        <p
          style={{
            marginTop: 14,
            fontSize: 16,
            fontStyle: "italic",
            color: "var(--text-sub)",
            lineHeight: 1.55,
            maxWidth: 760,
          }}
        >
          {excerpt}
        </p>
      )}

      <div
        style={{
          marginTop: 22,
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
          paddingBottom: 20,
        }}
      >
        {coverage.contact && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--surface-container-low)",
                color: "var(--text-sub)",
                fontSize: 11,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {coverage.contact.name
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                }}
              >
                {coverage.contact.name}
              </div>
              {coverage.contact.outlet && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-sub)",
                    fontStyle: "italic",
                  }}
                >
                  {coverage.contact.outlet}
                </div>
              )}
            </div>
          </div>
        )}

        <MetaItem icon="events" label={formatDateTime(coverage.date, locale, timezone)} />

        {hostname && (
          <MetaItem icon="coverage" label={hostname} />
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {coverage.attachmentUrl && (
            <a
              href={coverage.attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <Button variant="outline" size="sm" icon="file">
                Clip PDF
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" icon="edit" onClick={onEdit}>
            Edit
          </Button>
          {coverage.url && (
            <a
              href={coverage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="no-underline"
            >
              <Button variant="primary" size="sm" icon="coverage">
                Open article
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Stats row — borders match Card tone but bottom is flush because
          we negate padding below and re-pad inside each cell. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
          borderTop: "1px solid var(--border-custom)",
          marginLeft: -28,
          marginRight: -28,
        }}
      >
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: "18px 20px",
              borderLeft: i === 0 ? "none" : "1px solid var(--border-custom)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-muted-custom)",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginTop: 8,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

type StatItemView = { label: string; value: string };

function MetaItem({ icon, label }: { icon: "events" | "coverage"; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "var(--text-sub)",
        fontWeight: 500,
      }}
    >
      <Icon name={icon} size={13} color="var(--text-muted-custom)" />
      <span style={{ fontFamily: "var(--font-mono)" }}>{label}</span>
    </div>
  );
}

/* ──────────────── Tabs ──────────────── */

function Tabs({ tab, onChange }: { tab: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--border-custom)",
      }}
    >
      {TABS.map((t) => {
        const on = tab === t.k;
        return (
          <button
            key={t.k}
            type="button"
            onClick={() => onChange(t.k)}
            style={{
              position: "relative",
              padding: "14px 20px",
              background: "transparent",
              border: "none",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: on ? "var(--accent-custom)" : "var(--text-muted-custom)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.label}
            {on && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 16,
                  right: 16,
                  bottom: -1,
                  height: 3,
                  borderRadius: 2,
                  background: "var(--accent-custom)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────── Article tab ──────────────── */

function ArticleTab({
  coverage,
  locale,
  onDelete,
}: {
  coverage: CoverageView;
  locale: string;
  onDelete: () => void;
}) {
  const wordCount = coverage.notes
    ? coverage.notes.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const readMin = wordCount > 0 ? Math.max(1, Math.round(wordCount / 225)) : null;

  const quotes = extractQuotes(coverage.notes);
  const paragraphs = coverage.notes
    ? coverage.notes
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 360px",
        gap: 20,
      }}
      className="max-md:!grid-cols-1"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero image placeholder */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <HeroArt attachmentUrl={coverage.attachmentUrl} />
        </Card>

        {/* Excerpt / body */}
        <Card style={{ padding: 22 }}>
          <MicroLabel>Excerpt</MicroLabel>
          {paragraphs.length > 0 ? (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              {paragraphs.slice(0, 3).map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p
              style={{
                marginTop: 12,
                fontSize: 14,
                color: "var(--text-muted-custom)",
                fontStyle: "italic",
              }}
            >
              No excerpt captured yet.
            </p>
          )}
          {wordCount > 0 && (
            <div
              style={{
                marginTop: 16,
                fontSize: 11,
                color: "var(--text-muted-custom)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {wordCount.toLocaleString()} words
              {readMin ? ` · ${readMin} min read` : ""}
            </div>
          )}
        </Card>

        {/* Pull quotes */}
        {quotes.length > 0 && (
          <Card style={{ padding: 22 }}>
            <MicroLabel>Pull quotes</MicroLabel>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {quotes.map((q, i) => (
                <div
                  key={i}
                  style={{
                    borderLeft: "3px solid var(--accent-custom)",
                    paddingLeft: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontStyle: "italic",
                      lineHeight: 1.55,
                      color: "var(--text-primary)",
                    }}
                  >
                    “{q}”
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" icon="close" onClick={onDelete}>
            Delete coverage
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ padding: 22 }}>
          <MicroLabel>Placement details</MicroLabel>
          <dl style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 0 }}>
            <Row label="Outlet" value={coverage.publication} />
            <Row
              label="Type"
              value={
                coverage.type.charAt(0).toUpperCase() + coverage.type.slice(1)
              }
            />
            <Row label="Published" value={formatDate(coverage.date, locale)} />
            {coverage.contact && (
              <Row label="Byline" value={coverage.contact.name} />
            )}
            {wordCount > 0 && (
              <Row label="Word count" value={wordCount.toLocaleString()} />
            )}
            {coverage.url && (
              <Row
                label="URL"
                value={
                  <a
                    href={coverage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--accent-custom)",
                      textDecoration: "none",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      wordBreak: "break-all",
                    }}
                  >
                    {hostnameOf(coverage.url) || coverage.url}
                  </a>
                }
                last
              />
            )}
          </dl>
        </Card>

        {coverage.campaign && (
          <Card style={{ padding: 22 }}>
            <MicroLabel>Attribution</MicroLabel>
            <div
              style={{
                marginTop: 12,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}
            >
              {coverage.campaign.client.name}
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: "var(--text-sub)",
                fontStyle: "italic",
              }}
            >
              for {coverage.campaign.name}
            </div>
            <div style={{ marginTop: 14 }}>
              <Link
                href={`/clients/${coverage.campaign.client.slug}`}
                className="no-underline"
              >
                <Button variant="outline" size="sm" icon="workspace">
                  View client
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {coverage.notes && (
          <Card style={{ padding: 22 }}>
            <MicroLabel>Notes</MicroLabel>
            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--text-sub)",
                whiteSpace: "pre-wrap",
                margin: "12px 0 0",
              }}
            >
              {coverage.notes}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function HeroArt({ attachmentUrl }: { attachmentUrl: string | null }) {
  if (attachmentUrl && /\.(png|jpe?g|webp|gif)$/i.test(attachmentUrl)) {
    return (
      <img
        src={attachmentUrl}
        alt=""
        style={{
          width: "100%",
          maxHeight: 480,
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }
  return (
    <div
      style={{
        aspectRatio: "16 / 9",
        background:
          "repeating-linear-gradient(135deg, var(--surface-container-low) 0 10px, var(--card-bg) 10px 20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 4,
        color: "var(--text-muted-custom)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
        }}
      >
        Hero image
      </div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
        attach a PDF or image to this placement
      </div>
    </div>
  );
}

function extractQuotes(text: string | null): string[] {
  if (!text) return [];
  const matches = text.match(/[“"][^“”"]{12,}[”"]/g);
  if (!matches) return [];
  return matches.slice(0, 3).map((m) => m.replace(/^[“"]|[”"]$/g, ""));
}

/* ──────────────── Analytics tab ──────────────── */

function AnalyticsTab({ coverage }: { coverage: CoverageView }) {
  // No analytics data in the schema yet — placeholders are shown with "—".
  const kpis: StatItemView[] = [
    {
      label: "Reach",
      value: coverage.mediaValue ? compactValue(coverage.mediaValue * 100) : "—",
    },
    { label: "Engagement", value: "—" },
    { label: "Share of voice", value: "—" },
    { label: "Syndications", value: "—" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
        className="max-md:!grid-cols-2"
      >
        {kpis.map((k) => (
          <Card key={k.label} style={{ padding: "18px 20px" }}>
            <MicroLabel>{k.label}</MicroLabel>
            <div
              style={{
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginTop: 8,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {k.value}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "var(--text-muted-custom)",
                fontStyle: "italic",
              }}
            >
              Tracking not yet wired.
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <MicroLabel>Shares over 14 days</MicroLabel>
          <div style={{ fontSize: 11, color: "var(--text-muted-custom)", fontStyle: "italic" }}>
            awaiting data
          </div>
        </div>
        <PlaceholderBars />
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
        className="max-md:!grid-cols-1"
      >
        <Card style={{ padding: 22 }}>
          <MicroLabel>Traffic by channel</MicroLabel>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {["Direct / Homepage", "Newsletter", "Social", "Search", "Other"].map((ch) => (
              <ChannelRow key={ch} label={ch} />
            ))}
          </div>
        </Card>
        <Card style={{ padding: 22 }}>
          <MicroLabel>Sentiment snapshot</MicroLabel>
          <div
            style={{
              marginTop: 14,
              fontSize: 30,
              fontWeight: 800,
              color: "var(--accent-custom)",
              lineHeight: 1,
            }}
          >
            —
            <span
              style={{
                marginLeft: 8,
                fontSize: 13,
                color: "var(--text-sub)",
                fontWeight: 600,
              }}
            >
              / 100
            </span>
          </div>
          <div
            style={{
              marginTop: 14,
              height: 8,
              borderRadius: 999,
              background: "var(--surface-container-low)",
              overflow: "hidden",
            }}
          />
          <div
            style={{
              marginTop: 14,
              fontSize: 13,
              color: "var(--text-sub)",
              lineHeight: 1.6,
            }}
          >
            Sentiment scoring isn't connected yet. When it is, you'll see the
            positive / neutral / negative split and recurring themes here.
          </div>
        </Card>
      </div>
    </div>
  );
}

function PlaceholderBars() {
  const heights = [24, 36, 54, 72, 96, 82, 64, 50, 42, 36, 32, 28, 24, 20];
  return (
    <div
      style={{
        marginTop: 18,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 8,
        height: 140,
      }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: h,
            borderRadius: 4,
            background:
              i === 4 ? "var(--accent-custom)" : "var(--surface-container-low)",
            opacity: i === 4 ? 1 : 0.7,
          }}
          title={`D${i + 1}`}
        />
      ))}
    </div>
  );
}

function ChannelRow({ label }: { label: string }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: "var(--text-primary)",
          fontWeight: 500,
          marginBottom: 4,
        }}
      >
        <span>{label}</span>
        <span
          style={{
            color: "var(--text-muted-custom)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
        >
          —
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "var(--surface-container-low)",
          overflow: "hidden",
        }}
      />
    </div>
  );
}

/* ──────────────── Distribution tab ──────────────── */

function DistributionTab({
  coverage,
  locale,
  timezone,
}: {
  coverage: CoverageView;
  locale: string;
  timezone: string;
}) {
  // Timeline uses what's real: logged date and createdAt. Rest is placeholder.
  const mediumIsWeb = !!coverage.url;
  const mediumIsPrint = !!coverage.attachmentUrl && !mediumIsWeb;

  const mediums = [
    { key: "web", label: "Web", on: mediumIsWeb },
    { key: "print", label: "Print", on: mediumIsPrint },
    { key: "newsletter", label: "Newsletter", on: false },
    { key: "social", label: "Social", on: false },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: 22 }}>
        <MicroLabel>Medium split</MicroLabel>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            height: 36,
            borderRadius: 10,
            overflow: "hidden",
            border: "1px solid var(--border-custom)",
          }}
        >
          {mediums.map((m) => (
            <div
              key={m.key}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: m.on ? "#fff" : "var(--text-muted-custom)",
                background: m.on
                  ? "var(--accent-custom)"
                  : "var(--surface-container-low)",
              }}
            >
              {m.label}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {mediums.map((m) => (
            <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: m.on
                    ? "var(--accent-custom)"
                    : "var(--surface-container-low)",
                  border: "1px solid var(--border-custom)",
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                {m.label}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted-custom)",
                  fontFamily: "var(--font-mono)",
                  marginLeft: "auto",
                }}
              >
                {m.on ? "yes" : "—"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 22 }}>
        <MicroLabel>Distribution timeline</MicroLabel>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column" }}>
          <TimelineEvent
            when={coverage.date}
            label="Article published"
            active
            locale={locale}
            timezone={timezone}
          />
          {coverage.createdAt !== coverage.date && (
            <TimelineEvent
              when={coverage.createdAt}
              label="Logged to Pressroom"
              locale={locale}
              timezone={timezone}
            />
          )}
          <TimelineEvent
            when={null}
            label="Syndication tracking awaits data"
            locale={locale}
            timezone={timezone}
          />
        </div>
      </Card>
    </div>
  );
}

function TimelineEvent({
  when,
  label,
  active,
  locale,
  timezone,
}: {
  when: string | null;
  label: string;
  active?: boolean;
  locale: string;
  timezone: string;
}) {
  const whenStr = when
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
      }).format(new Date(when))
    : "—";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 24px 1fr",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid var(--border-custom)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted-custom)",
        }}
      >
        {whenStr}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: active ? "var(--accent-custom)" : "var(--border-mid)",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: active ? 700 : 500,
          color: active ? "var(--text-primary)" : "var(--text-sub)",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ──────────────── Related tab ──────────────── */

function RelatedTab({
  related,
  locale,
  currency,
}: {
  related: RelatedCoverageView[];
  locale: string;
  currency: string;
}) {
  if (related.length === 0) {
    return (
      <Card style={{ padding: 40, textAlign: "center" }}>
        <MicroLabel>Other coverage from this campaign</MicroLabel>
        <div
          style={{
            marginTop: 14,
            fontSize: 14,
            color: "var(--text-muted-custom)",
            fontStyle: "italic",
          }}
        >
          No other coverage logged for this campaign yet.
        </div>
      </Card>
    );
  }
  return (
    <Card style={{ padding: 0 }}>
      <div
        style={{
          padding: "16px 22px",
          borderBottom: "1px solid var(--border-custom)",
        }}
      >
        <MicroLabel>Other coverage from this campaign</MicroLabel>
      </div>
      {related.map((r, i) => (
        <Link
          key={r.id}
          href={`/coverage/${r.slug}`}
          className="no-underline"
          style={{
            display: "grid",
            gridTemplateColumns: "72px 1fr auto 18px",
            alignItems: "center",
            gap: 16,
            padding: "16px 22px",
            borderTop: i === 0 ? "none" : "1px solid var(--border-custom)",
            color: "inherit",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-mono)",
              color: "var(--text-primary)",
            }}
          >
            {formatRelativeShort(r.date)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--accent-custom)",
              }}
            >
              {r.publication}
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.005em",
                color: "var(--text-primary)",
                marginTop: 4,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {r.headline}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <MicroLabel>Reach</MicroLabel>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "var(--text-primary)",
                marginTop: 4,
                fontFamily: "var(--font-mono)",
              }}
            >
              {r.mediaValue ? compactValue(r.mediaValue * 100) : "—"}
            </div>
          </div>
          <Icon name="chevronR" size={14} color="var(--text-muted-custom)" />
        </Link>
      ))}
    </Card>
  );
}

function formatRelativeShort(iso: string): string {
  const d = new Date(iso);
  const diffDays = Math.max(0, Math.round((Date.now() - d.getTime()) / 86_400_000));
  if (diffDays === 0) return "today";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 60) return `${Math.round(diffDays / 7)}w`;
  return `${Math.round(diffDays / 30)}mo`;
}

/* ──────────────── Small bits ──────────────── */

function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--text-muted-custom)",
      }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: last ? "none" : "1px solid var(--border-custom)",
        gap: 12,
      }}
    >
      <dt
        style={{
          fontSize: 12,
          color: "var(--text-sub)",
          fontWeight: 600,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
          textAlign: "right",
        }}
      >
        {value}
      </dd>
    </div>
  );
}
