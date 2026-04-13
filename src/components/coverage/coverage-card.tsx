"use client";

import { useState, useTransition } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMediaValue(value: number): string {
  return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

export function CoverageCard({ coverage, campaigns, contacts }: CoverageCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this coverage entry?")) return;
    startTransition(async () => {
      await deleteCoverage(coverage.id);
    });
  }

  const typeLabel = coverage.type.charAt(0).toUpperCase() + coverage.type.slice(1);
  const hasImage = coverage.attachmentUrl && isImageUrl(coverage.attachmentUrl);
  const hasPdf = coverage.attachmentUrl && !hasImage;

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
      <div
        style={{
          border: "1px solid var(--border-custom)",
          borderRadius: 10,
          backgroundColor: "var(--card-bg)",
          opacity: isPending ? 0.5 : 1,
          transition: "opacity 0.15s",
          overflow: "hidden",
          display: "flex",
          flexDirection: hasImage ? "row" : "column",
        }}
      >
        {/* Image section — large featured clipping */}
        {hasImage && (
          <a
            href={coverage.attachmentUrl!}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: 160,
              minHeight: 120,
              flexShrink: 0,
              display: "block",
              overflow: "hidden",
              backgroundColor: "var(--page-bg)",
            }}
          >
            <img
              src={coverage.attachmentUrl!}
              alt={`${coverage.publication} clipping`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </a>
        )}

        {/* Content section */}
        <div style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Row 1: publication + type + date */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {coverage.publication}
            </span>
            <Badge variant={typeBadgeVariant[coverage.type] ?? "default"}>
              {typeLabel}
            </Badge>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted-custom)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {formatDate(coverage.date)}
            </span>
          </div>

          {/* Row 2: campaign + contact */}
          {(coverage.campaign || coverage.contact) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--text-sub)",
              }}
            >
              {coverage.campaign && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      backgroundColor: coverage.campaign.client.bgColour,
                      color: coverage.campaign.client.colour,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 7,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {coverage.campaign.client.initials}
                  </span>
                  <span>{coverage.campaign.name}</span>
                </div>
              )}
              {coverage.campaign && coverage.contact && (
                <span style={{ color: "var(--text-muted-custom)" }}>·</span>
              )}
              {coverage.contact && <span>{coverage.contact.name}</span>}
            </div>
          )}

          {/* Row 3: media value + URL + PDF indicator + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
            {coverage.mediaValue != null && Number(coverage.mediaValue) > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>
                {formatMediaValue(Number(coverage.mediaValue))}
              </span>
            )}
            {coverage.url && (
              <a
                href={coverage.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11,
                  color: "var(--accent-custom)",
                  textDecoration: "none",
                }}
              >
                View article →
              </a>
            )}
            {hasPdf && (
              <a
                href={coverage.attachmentUrl!}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  color: "var(--text-sub)",
                  textDecoration: "none",
                }}
              >
                <Icon name="campaigns" size={11} color="var(--text-sub)" />
                PDF
              </a>
            )}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setEditOpen(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--text-muted-custom)",
              }}
            >
              <Icon name="edit" size={13} color="var(--text-muted-custom)" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--text-muted-custom)",
              }}
            >
              <Icon name="close" size={13} color="var(--text-muted-custom)" />
            </button>
          </div>
        </div>
      </div>

      <SlideOverPanel
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Coverage"
      >
        <CoverageForm
          coverage={formCoverage}
          campaigns={campaigns}
          contacts={contacts}
          onSuccess={() => setEditOpen(false)}
        />
      </SlideOverPanel>
    </>
  );
}
