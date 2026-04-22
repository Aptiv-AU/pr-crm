"use client";

import { useState, useTransition } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ClientBadge } from "@/components/shared/client-badge";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { CoverageForm } from "./coverage-form";
import { deleteCoverage } from "@/actions/coverage-actions";

interface CoverageCardProps {
  coverage: {
    id: string;
    publication: string;
    date: Date | string;
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
        initials: string;
        colour: string;
        bgColour: string;
      };
    } | null;
    contact: {
      id: string;
      name: string;
    } | null;
  };
  campaigns: { id: string; name: string }[];
  contacts: { id: string; name: string }[];
}

const typeBadgeVariant: Record<string, BadgeVariant> = {
  feature: "active",
  mention: "default",
  review: "accent",
  social: "outreach",
};

function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatMediaValue(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

export function CoverageCard({ coverage, campaigns, contacts }: CoverageCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this coverage entry?")) return;
    startTransition(async () => {
      await deleteCoverage(coverage.id);
      setDetailOpen(false);
    });
  }

  const typeLabel = coverage.type.charAt(0).toUpperCase() + coverage.type.slice(1);
  const hasImage = !!(coverage.attachmentUrl && isImageUrl(coverage.attachmentUrl));

  const formCoverage = {
    id: coverage.id,
    publication: coverage.publication,
    date: typeof coverage.date === "string"
      ? coverage.date.split("T")[0]
      : coverage.date.toISOString().split("T")[0],
    type: coverage.type,
    url: coverage.url,
    mediaValue: coverage.mediaValue ? Number(coverage.mediaValue) : null,
    attachmentUrl: coverage.attachmentUrl,
    notes: coverage.notes,
    campaignId: coverage.campaignId,
    contactId: coverage.contactId,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setDetailOpen(true)}
        aria-label={`Open coverage: ${coverage.publication}`}
        style={{
          appearance: "none",
          textAlign: "left",
          font: "inherit",
          color: "inherit",
          width: "100%",
          minHeight: 88,
          border: "none",
          borderRadius: 12,
          backgroundColor: "var(--card-bg)",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          opacity: isPending ? 0.5 : 1,
          transition: "opacity 0.15s, box-shadow 0.15s",
          overflow: "hidden",
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          padding: 0,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
        }}
      >
        {/* Content — left / main */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {/* Row 1: outlet + date */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "var(--text-muted-custom)",
              lineHeight: 1,
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                flex: 1,
              }}
            >
              {coverage.publication}
            </span>
            <span style={{ flexShrink: 0 }}>{formatShortDate(coverage.date)}</span>
          </div>

          {/* Row 2: title (notes as surrogate) — primary text */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {coverage.notes?.trim() || coverage.publication}
          </div>

          {/* Row 3: badges + media value */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              marginTop: 2,
            }}
          >
            {coverage.campaign && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <ClientBadge client={coverage.campaign.client} size={18} />
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-sub)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}
                >
                  {coverage.campaign.client.name}
                </span>
              </div>
            )}
            <Badge variant={typeBadgeVariant[coverage.type] ?? "default"}>{typeLabel}</Badge>
            {coverage.mediaValue != null && Number(coverage.mediaValue) > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green)" }}>
                {formatMediaValue(Number(coverage.mediaValue))}
              </span>
            )}
            {coverage.attachmentUrl && !hasImage && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  color: "var(--text-muted-custom)",
                }}
              >
                <Icon name="campaigns" size={11} color="var(--text-muted-custom)" />
                PDF
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail — right */}
        {hasImage && (
          <div
            style={{
              width: 72,
              height: 72,
              flexShrink: 0,
              alignSelf: "center",
              marginRight: 12,
              borderRadius: 8,
              overflow: "hidden",
              backgroundColor: "var(--page-bg)",
              border: "1px solid var(--border-custom)",
            }}
          >
            <img
              src={coverage.attachmentUrl!}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
        )}
      </button>

      <SlideOverPanel
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Coverage Details"
      >
        <CoverageForm
          coverage={formCoverage}
          campaigns={campaigns}
          contacts={contacts}
          onSuccess={() => setDetailOpen(false)}
        />
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--border-custom)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            icon="close"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete coverage"}
          </Button>
        </div>
      </SlideOverPanel>
    </>
  );
}
