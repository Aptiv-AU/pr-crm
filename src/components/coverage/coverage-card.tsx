"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { CoverageForm } from "./coverage-form";
import { deleteCoverage } from "@/actions/coverage-actions";

const TEAL2 = "#006C49";

interface CoverageRowProps {
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
  isFirst?: boolean;
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "now";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMediaValue(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function CoverageRow({ coverage, campaigns, contacts, isFirst }: CoverageRowProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this coverage entry?")) return;
    startTransition(async () => {
      await deleteCoverage(coverage.id);
      setDetailOpen(false);
    });
  }

  const dateObj = typeof coverage.date === "string" ? new Date(coverage.date) : coverage.date;
  const typeLabel = coverage.type.charAt(0).toUpperCase() + coverage.type.slice(1);
  const headline = coverage.notes?.trim() || coverage.publication;
  const mediaValue = coverage.mediaValue != null ? Number(coverage.mediaValue) : null;
  const hasValue = mediaValue != null && mediaValue > 0;

  const formCoverage = {
    id: coverage.id,
    publication: coverage.publication,
    date: typeof coverage.date === "string"
      ? coverage.date.split("T")[0]
      : coverage.date.toISOString().split("T")[0],
    type: coverage.type,
    url: coverage.url,
    mediaValue,
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
          border: "none",
          background: "transparent",
          display: "flex",
          gap: 16,
          padding: "18px 20px",
          borderTop: isFirst ? "none" : "1px solid var(--border-custom)",
          alignItems: "flex-start",
          cursor: "pointer",
          opacity: isPending ? 0.5 : 1,
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--surface-container-low)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div style={{ width: 56, flexShrink: 0 }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-mono)",
              color: "var(--text-primary)",
              lineHeight: 1.05,
            }}
          >
            {formatRelative(dateObj)}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-muted-custom)",
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {formatShortDate(dateObj)}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: TEAL2,
              }}
            >
              {coverage.publication}
            </span>
            <Badge>{typeLabel}</Badge>
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "-0.005em",
              lineHeight: 1.3,
              marginBottom: 6,
              color: "var(--text-primary)",
              wordBreak: "break-word",
            }}
          >
            {headline}
          </div>
          {(coverage.contact || coverage.campaign) && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-sub)",
                fontWeight: 500,
              }}
            >
              {coverage.contact && (
                <>
                  By <span style={{ fontStyle: "italic" }}>{coverage.contact.name}</span>
                </>
              )}
              {coverage.campaign && (
                <span style={{ color: "var(--text-muted-custom)" }}>
                  {coverage.contact ? " " : ""}— for {coverage.campaign.name}
                </span>
              )}
            </div>
          )}
        </div>

        {hasValue && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted-custom)",
              }}
            >
              Value
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                marginTop: 4,
              }}
            >
              {formatMediaValue(mediaValue)}
            </div>
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

export { CoverageRow as CoverageCard };
