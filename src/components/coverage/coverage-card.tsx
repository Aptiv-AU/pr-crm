"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const TEAL2 = "#006C49";

interface CoverageRowProps {
  coverage: {
    id: string;
    slug: string;
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

export function CoverageRow({ coverage, isFirst }: CoverageRowProps) {
  const dateObj = typeof coverage.date === "string" ? new Date(coverage.date) : coverage.date;
  const typeLabel = coverage.type.charAt(0).toUpperCase() + coverage.type.slice(1);
  const headline = coverage.notes?.trim() || coverage.publication;
  const mediaValue = coverage.mediaValue != null ? Number(coverage.mediaValue) : null;
  const hasValue = mediaValue != null && mediaValue > 0;

  return (
    <Link
      href={`/coverage/${coverage.slug}`}
      className="no-underline"
      style={{
        color: "inherit",
        width: "100%",
        display: "flex",
        gap: 16,
        padding: "18px 20px",
        borderTop: isFirst ? "none" : "1px solid var(--border-custom)",
        alignItems: "flex-start",
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
    </Link>
  );
}

export { CoverageRow as CoverageCard };
