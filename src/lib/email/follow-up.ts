import { db } from "@/lib/db";
import { getValidToken, getConversationReplies } from "./microsoft-graph";
import { getAIConfig } from "@/lib/ai/get-config";
import { generateText } from "@/lib/ai/provider";
import { parsePitchResponse } from "@/lib/ai/prompts";

/**
 * Check for replies to sent outreaches for a given organization.
 * Returns the count of new replies found.
 */
export async function checkForReplies(organizationId: string): Promise<number> {
  const outreaches = await db.outreach.findMany({
    where: {
      campaign: { organizationId },
      status: "sent",
      conversationId: { not: null },
    },
    include: {
      contact: true,
      campaign: true,
    },
  });

  if (outreaches.length === 0) return 0;

  const emailAccount = await db.emailAccount.findFirst({
    where: {
      user: { organizationId },
    },
  });

  if (!emailAccount) return 0;

  const accessToken = await getValidToken(emailAccount.id);

  let replyCount = 0;

  for (const outreach of outreaches) {
    if (!outreach.conversationId || !outreach.sentAt) continue;

    try {
      const replies = await getConversationReplies(
        accessToken,
        outreach.conversationId,
        outreach.sentAt
      );

      if (replies.length > 0) {
        const firstReply = replies[0];

        await db.outreach.update({
          where: { id: outreach.id },
          data: { status: "replied" },
        });

        await db.interaction.create({
          data: {
            type: "reply_received",
            contactId: outreach.contactId,
            campaignId: outreach.campaignId,
            organizationId: outreach.campaign.organizationId,
            date: new Date(firstReply.receivedDateTime),
            summary: `Reply received: ${firstReply.bodyPreview.slice(0, 100)}`,
          },
        });

        replyCount++;
      }
    } catch (error) {
      console.error(
        `Failed to check replies for outreach ${outreach.id}:`,
        error
      );
    }
  }

  return replyCount;
}

/**
 * Generate follow-up drafts for outreaches that haven't received replies.
 * Returns the count of follow-ups generated.
 */
export async function generateFollowUps(
  organizationId: string
): Promise<number> {
  const config = await getAIConfig();
  if (!config) return 0;

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find outreaches needing follow-up #1: sent, not replied, followUpNumber=0, sent >= 3 days ago
  const needsFirstFollowUp = await db.outreach.findMany({
    where: {
      campaign: { organizationId },
      status: "sent",
      followUpNumber: 0,
      sentAt: { lte: threeDaysAgo },
    },
    include: {
      contact: true,
      campaign: true,
    },
  });

  // Find outreaches needing follow-up #2: sent, not replied, followUpNumber=1, sent >= 7 days ago
  const needsSecondFollowUp = await db.outreach.findMany({
    where: {
      campaign: { organizationId },
      status: "sent",
      followUpNumber: 1,
      sentAt: { lte: sevenDaysAgo },
    },
    include: {
      contact: true,
      campaign: true,
    },
  });

  const candidates = [
    ...needsFirstFollowUp.map((o) => ({ outreach: o, nextFollowUp: 1 })),
    ...needsSecondFollowUp.map((o) => ({ outreach: o, nextFollowUp: 2 })),
  ];

  let generated = 0;

  for (const { outreach, nextFollowUp } of candidates) {
    // Check if a follow-up already exists for this campaign+contact at this followUpNumber
    const existing = await db.outreach.findFirst({
      where: {
        campaignId: outreach.campaignId,
        contactId: outreach.contactId,
        followUpNumber: nextFollowUp,
      },
    });

    if (existing) continue;

    try {
      const response = await generateText(config, {
        systemPrompt:
          "You are a PR professional writing a brief, friendly follow-up to a press pitch that hasn't received a response. Keep it under 100 words. Be warm, not pushy.",
        userPrompt: `Original pitch subject: ${outreach.subject}\nOriginal pitch (first 200 chars): ${outreach.body.slice(0, 200)}...\nJournalist: ${outreach.contact.name} at ${outreach.contact.outlet ?? "their outlet"}\nThis is follow-up #${nextFollowUp}.\n\nWrite a subject line and follow-up email body.\nSUBJECT: ...\nBODY: ...`,
        temperature: 0.7,
        maxTokens: 512,
      });

      const parsed = parsePitchResponse(response);

      await db.outreach.create({
        data: {
          campaignId: outreach.campaignId,
          contactId: outreach.contactId,
          subject: parsed.subject || `Re: ${outreach.subject}`,
          body: parsed.body || response,
          status: "draft",
          followUpNumber: nextFollowUp,
          generatedByAI: true,
        },
      });

      generated++;
    } catch (error) {
      console.error(
        `Failed to generate follow-up for outreach ${outreach.id}:`,
        error
      );
    }
  }

  return generated;
}
