import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { CampaignReport } from "@/lib/pdf/campaign-report";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: {
      client: {
        select: {
          name: true,
          colour: true,
          bgColour: true,
        },
      },
      organization: {
        select: {
          name: true,
          logo: true,
          contactEmail: true,
          primaryColour: true,
          currency: true,
        },
      },
      coverages: {
        select: {
          publication: true,
          date: true,
          type: true,
          mediaValue: true,
        },
        orderBy: { date: "desc" },
      },
      outreaches: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!campaign) {
    return new Response("Campaign not found", { status: 404 });
  }

  // Compute stats
  const sentStatuses = ["sent", "replied"];
  const outreachSent = campaign.outreaches.filter((o) =>
    sentStatuses.includes(o.status)
  ).length;
  const repliedCount = campaign.outreaches.filter(
    (o) => o.status === "replied"
  ).length;
  const replyRate =
    outreachSent > 0 ? Math.round((repliedCount / outreachSent) * 100) : 0;

  const coverageCount = campaign.coverages.length;
  const totalMediaValue = campaign.coverages.reduce(
    (sum, c) => sum + (c.mediaValue ? Number(c.mediaValue) : 0),
    0
  );

  const coverages = campaign.coverages.map((c) => ({
    publication: c.publication,
    date: c.date.toISOString(),
    type: c.type,
    mediaValue: c.mediaValue ? Number(c.mediaValue) : null,
  }));

  const org = campaign.organization;
  const client = campaign.client;

  const pdfElement = React.createElement(CampaignReport, {
    orgName: org.name,
    orgLogo: org.logo,
    orgEmail: org.contactEmail,
    orgColour: org.primaryColour,
    currency: org.currency,
    clientName: client.name,
    clientColour: client.colour,
    clientBgColour: client.bgColour,
    campaignName: campaign.name,
    campaignType: campaign.type,
    startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
    dueDate: campaign.dueDate ? campaign.dueDate.toISOString() : null,
    outreachSent,
    replyRate,
    coverageCount,
    totalMediaValue,
    coverages,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(pdfElement);
  } catch {
    // Fallback: try renderToStream if renderToBuffer is unavailable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { renderToStream } = await import("@react-pdf/renderer") as any;
    const stream = await renderToStream(pdfElement);
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    pdfBuffer = Buffer.concat(chunks);
  }

  const safeName = `${client.name}-${campaign.name}-Report`.replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}
