import { db } from "@/lib/db";
import { providerFor } from "./provider";
import { getAIConfig } from "@/lib/ai/get-config";
import { generateText } from "@/lib/ai/provider";
import { parsePitchResponse } from "@/lib/ai/prompts";
import { OutreachStatus, type Prisma } from "@prisma/client";

const OUTREACHES_CONCURRENCY = 5;
const FOLLOWUPS_CONCURRENCY = 5;
// Don't re-check the same outreach faster than this.
const REPLY_CHECK_STALENESS_MS = 60 * 60 * 1000; // 1 hour
// Stop checking outreaches sent more than this many days ago.
const REPLY_CHECK_WINDOW_DAYS = 14;

type OutreachWithRefs = Prisma.OutreachGetPayload<{
  include: { contact: true; campaign: true };
}>;

/**
 * Check for replies to sent outreaches for a given organization.
 * Returns the count of new replies found.
 *
 * Performance:
 * - Windows to outreaches sent within REPLY_CHECK_WINDOW_DAYS.
 * - Skips outreaches re-checked within REPLY_CHECK_STALENESS_MS.
 * - Processes outreaches in bounded-concurrency batches of OUTREACHES_CONCURRENCY.
 */
export async function checkForReplies(organizationId: string): Promise<number> {
  const now = Date.now();
  const windowCutoff = new Date(now - REPLY_CHECK_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const staleCutoff = new Date(now - REPLY_CHECK_STALENESS_MS);

  const outreaches = await db.outreach.findMany({
    where: {
      campaign: { organizationId },
      status: OutreachStatus.sent,
      threadId: { not: null },
      sentAt: { gte: windowCutoff },
      OR: [
        { lastCheckedForReplyAt: null },
        { lastCheckedForReplyAt: { lt: staleCutoff } },
      ],
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

  const provider = providerFor(emailAccount);
  const accessToken = await provider.getValidToken(emailAccount.id);

  let replyCount = 0;

  for (let i = 0; i < outreaches.length; i += OUTREACHES_CONCURRENCY) {
    const batch = outreaches.slice(i, i + OUTREACHES_CONCURRENCY);
    const results = await Promise.all(
      batch.map((o) => checkOne(o, accessToken, provider))
    );
    replyCount += results.filter(Boolean).length;
  }

  return replyCount;
}

async function checkOne(
  outreach: OutreachWithRefs,
  accessToken: string,
  provider: ReturnType<typeof providerFor>
): Promise<boolean> {
  // Guarded by the findMany filter, but keep local invariants explicit.
  if (!outreach.threadId || !outreach.sentAt) return false;

  try {
    const replies = await provider.getReplies(
      accessToken,
      outreach.threadId,
      outreach.sentAt
    );

    if (replies.length > 0) {
      const firstReply = replies[0];

      await db.outreach.update({
        where: { id: outreach.id },
        data: {
          status: OutreachStatus.replied,
          lastCheckedForReplyAt: new Date(),
        },
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

      return true;
    }

    await db.outreach.update({
      where: { id: outreach.id },
      data: { lastCheckedForReplyAt: new Date() },
    });

    return false;
  } catch (error) {
    console.error(
      `Failed to check replies for outreach ${outreach.id}:`,
      error
    );
    // Still stamp so a broken thread doesn't get hammered every cron tick.
    await db.outreach
      .update({
        where: { id: outreach.id },
        data: { lastCheckedForReplyAt: new Date() },
      })
      .catch(() => {});
    return false;
  }
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
      status: OutreachStatus.sent,
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
      status: OutreachStatus.sent,
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

  if (candidates.length === 0) return 0;

  let generated = 0;

  for (let i = 0; i < candidates.length; i += FOLLOWUPS_CONCURRENCY) {
    const batch = candidates.slice(i, i + FOLLOWUPS_CONCURRENCY);
    const results = await Promise.all(
      batch.map(({ outreach, nextFollowUp }) =>
        generateOneFollowUp(outreach, nextFollowUp, config)
      )
    );
    generated += results.filter(Boolean).length;
  }

  return generated;
}

async function generateOneFollowUp(
  outreach: OutreachWithRefs,
  nextFollowUp: number,
  config: NonNullable<Awaited<ReturnType<typeof getAIConfig>>>
): Promise<boolean> {
  // Check if a follow-up already exists for this campaign+contact at this followUpNumber
  const existing = await db.outreach.findFirst({
    where: {
      campaignId: outreach.campaignId,
      contactId: outreach.contactId,
      followUpNumber: nextFollowUp,
    },
  });

  if (existing) return false;

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
        status: OutreachStatus.draft,
        followUpNumber: nextFollowUp,
        generatedByAI: true,
      },
    });

    return true;
  } catch (error) {
    console.error(
      `Failed to generate follow-up for outreach ${outreach.id}:`,
      error
    );
    return false;
  }
}
