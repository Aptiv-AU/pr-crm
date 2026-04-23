import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { isCuid } from "@/lib/slug/resolve";
import { getCurrentOrg } from "@/lib/queries/org-queries";
import { CoverageDetailClient } from "@/components/coverage/coverage-detail-client";

export const dynamic = "force-dynamic";

export default async function CoverageDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: handle } = await params;

  const org = await getCurrentOrg();
  if (!org) notFound();

  const coverage = await db.coverage.findFirst({
    where: isCuid(handle)
      ? { id: handle, organizationId: org.id }
      : { slug: handle, organizationId: org.id },
    include: {
      campaign: {
        include: {
          client: true,
        },
      },
      contact: true,
    },
  });

  if (!coverage) notFound();

  // Related: other coverage from the same campaign (if any), most recent first.
  const related = coverage.campaignId
    ? await db.coverage.findMany({
        where: {
          campaignId: coverage.campaignId,
          id: { not: coverage.id },
        },
        orderBy: { date: "desc" },
        take: 6,
        select: {
          id: true,
          slug: true,
          publication: true,
          notes: true,
          date: true,
          mediaValue: true,
        },
      })
    : [];

  // Campaigns + contacts for the edit form.
  const [campaigns, contacts] = await Promise.all([
    db.campaign.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.contact.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = {
    id: coverage.id,
    slug: coverage.slug,
    publication: coverage.publication,
    date: coverage.date.toISOString(),
    createdAt: coverage.createdAt.toISOString(),
    type: coverage.type,
    url: coverage.url,
    mediaValue: coverage.mediaValue ? Number(coverage.mediaValue) : null,
    attachmentUrl: coverage.attachmentUrl,
    notes: coverage.notes,
    campaignId: coverage.campaignId,
    contactId: coverage.contactId,
    campaign: coverage.campaign
      ? {
          id: coverage.campaign.id,
          name: coverage.campaign.name,
          client: {
            id: coverage.campaign.client.id,
            name: coverage.campaign.client.name,
            slug: coverage.campaign.client.slug,
            initials: coverage.campaign.client.initials,
            colour: coverage.campaign.client.colour,
            bgColour: coverage.campaign.client.bgColour,
          },
        }
      : null,
    contact: coverage.contact
      ? {
          id: coverage.contact.id,
          name: coverage.contact.name,
          outlet: coverage.contact.outlet ?? null,
          beat: coverage.contact.beat ?? null,
        }
      : null,
  };

  const relatedSerialized = related.map((r) => ({
    id: r.id,
    slug: r.slug,
    publication: r.publication,
    headline: r.notes?.trim() || r.publication,
    date: r.date.toISOString(),
    mediaValue: r.mediaValue ? Number(r.mediaValue) : null,
  }));

  return (
    <CoverageDetailClient
      coverage={serialized}
      related={relatedSerialized}
      campaigns={campaigns}
      contacts={contacts}
      locale={org.locale || "en-AU"}
      currency={org.currency || "AUD"}
      timezone={org.timezone || "Australia/Sydney"}
    />
  );
}
