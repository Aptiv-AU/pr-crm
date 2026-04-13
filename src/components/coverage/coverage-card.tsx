"use client";

import { useState, useTransition } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
          padding: 16,
          backgroundColor: "var(--card-bg)",
          opacity: isPending ? 0.5 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {/* Top row: publication + type badge + date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {coverage.publication}
            </span>
            <Badge variant={typeBadgeVariant[coverage.type] ?? "default"}>
              {typeLabel}
            </Badge>
          </div>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-muted-custom)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {formatDate(coverage.date)}
          </span>
        </div>

        {/* Second row: campaign/client + contact */}
        {(coverage.campaign || coverage.contact) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
              fontSize: 12,
              color: "var(--text-sub)",
            }}
          >
            {coverage.campaign && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
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
              <span style={{ color: "var(--text-muted-custom)" }}>|</span>
            )}
            {coverage.contact && <span>{coverage.contact.name}</span>}
          </div>
        )}

        {/* Third row: media value + URL + clipping */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 10,
          }}
        >
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
                fontSize: 12,
                color: "var(--accent-custom)",
                textDecoration: "none",
              }}
            >
              View article &rarr;
            </a>
          )}
          <div style={{ flex: 1 }} />
          {coverage.attachmentUrl && (
            isImageUrl(coverage.attachmentUrl) ? (
              <img
                src={coverage.attachmentUrl}
                alt="Clipping"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  objectFit: "cover",
                  border: "1px solid var(--border-custom)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  border: "1px solid var(--border-custom)",
                  backgroundColor: "var(--page-bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-sub)",
                }}
              >
                PDF
              </div>
            )
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 4,
            marginTop: 10,
          }}
        >
          <Button variant="ghost" size="xs" icon="edit" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button variant="ghost" size="xs" icon="close" onClick={handleDelete} disabled={isPending}>
            Delete
          </Button>
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
