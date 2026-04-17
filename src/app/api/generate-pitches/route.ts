import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireOrgId } from "@/lib/server/org";
import { getAIConfig } from "@/lib/ai/get-config";
import { generateText } from "@/lib/ai/provider";
import {
  buildPitchSystemPrompt,
  buildPitchUserPrompt,
  parsePitchResponse,
} from "@/lib/ai/prompts";

const MAX_CONTACTS_PER_REQUEST = 50;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const organizationId = await requireOrgId();

  const { campaignId, contactIds } = (await request.json()) as {
    campaignId: string;
    contactIds: string[];
  };

  if (!campaignId || !contactIds?.length) {
    return new Response(JSON.stringify({ error: "campaignId and contactIds are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (contactIds.length > MAX_CONTACTS_PER_REQUEST) {
    return new Response(
      JSON.stringify({
        error: `Too many contacts: max ${MAX_CONTACTS_PER_REQUEST} per request`,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const config = await getAIConfig();
  if (!config) {
    return new Response(
      JSON.stringify({ error: "No AI provider configured. Add an API key in environment variables." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId },
    include: { client: true },
  });

  if (!campaign) {
    return new Response(JSON.stringify({ error: "Campaign not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!campaign.brief) {
    return new Response(JSON.stringify({ error: "Campaign brief is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contacts = await db.contact.findMany({
    where: { id: { in: contactIds }, organizationId },
  });

  if (contacts.length === 0) {
    return new Response(JSON.stringify({ error: "No valid contacts found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      let totalGenerated = 0;
      const systemPrompt = buildPitchSystemPrompt(campaign.client.name, campaign.client.industry);

      for (const contact of contacts) {
        // Defence-in-depth: both campaign and contact were already loaded scoped
        // to organizationId, but assert here so a future refactor can't silently
        // weaken this.
        if (
          campaign.organizationId !== organizationId ||
          contact.organizationId !== organizationId
        ) {
          continue;
        }

        try {
          send({
            type: "generating",
            contactId: contact.id,
            contactName: contact.name,
          });

          const userPrompt = buildPitchUserPrompt(
            campaign.brief!,
            campaign.client.name,
            campaign.client.industry,
            {
              name: contact.name,
              outlet: contact.outlet ?? "",
              beat: contact.beat ?? "",
              tier: contact.tier ?? "",
            }
          );

          const response = await generateText(config, {
            systemPrompt,
            userPrompt,
            temperature: 0.7,
            maxTokens: 1024,
          });

          const { subject, body } = parsePitchResponse(response);

          // Upsert: check if a draft already exists for this campaign+contact
          const existing = await db.outreach.findFirst({
            where: {
              campaignId: campaign.id,
              contactId: contact.id,
              followUpNumber: 0,
            },
          });

          if (existing) {
            await db.outreach.update({
              where: { id: existing.id },
              data: { subject, body, generatedByAI: true, status: "draft" },
            });
          } else {
            await db.outreach.create({
              data: {
                campaignId: campaign.id,
                contactId: contact.id,
                subject,
                body,
                generatedByAI: true,
                followUpNumber: 0,
                status: "draft",
              },
            });
          }

          totalGenerated++;

          send({
            type: "complete",
            contactId: contact.id,
            subject,
            bodyPreview: body.slice(0, 100) + (body.length > 100 ? "..." : ""),
          });
        } catch (error) {
          console.error(`Error generating pitch for contact ${contact.id}:`, error);
          send({
            type: "error",
            contactId: contact.id,
            error: error instanceof Error ? error.message : "Failed to generate pitch",
          });
        }
      }

      send({ type: "done", totalGenerated });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
