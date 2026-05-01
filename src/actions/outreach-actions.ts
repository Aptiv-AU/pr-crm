"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { getAIConfig } from "@/lib/ai/get-config";
import { generateText } from "@/lib/ai/provider";
import { buildContactSuggestionPrompt } from "@/lib/ai/prompts";
import { providerFor, type SendResult } from "@/lib/email/provider";
import { sanitizeSignatureHtml } from "@/lib/compose/sanitize-html";
import { escapeHtml, safeFontFamily, safeFontSize } from "@/lib/html/escape";
import { OutreachStatus, type EmailAccount, type Prisma } from "@prisma/client";

type SendableOutreach = Prisma.OutreachGetPayload<{
  include: { contact: true; campaign: true };
}>;

// H-5 failure recording lives in lib/outreach so cron + tests can import
// it without dragging in this module's "use server" graph.
import { recordSendFailure } from "@/lib/outreach/record-failure";
export { recordSendFailure };

export const saveBrief = action("saveBrief", async (campaignId: string, brief: string) => {
  const orgId = await requireOrgId();
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
    select: { id: true },
  });
  if (!campaign) throw new Error("Campaign not found");

  await db.campaign.update({
    where: { id: campaignId },
    data: { brief },
  });

  return {
    revalidate: [`/campaigns/${campaignId}`],
    revalidateTags: [`campaign:${campaignId}`],
  };
});

export const createOutreachDraft = action(
  "createOutreachDraft",
  async (
    campaignId: string,
    contactId: string,
    subject: string,
    body: string,
    generatedByAI: boolean
  ) => {
    const orgId = await requireOrgId();
    const [campaign, contact] = await Promise.all([
      db.campaign.findFirst({
        where: { id: campaignId, organizationId: orgId },
        select: { id: true },
      }),
      db.contact.findFirst({
        where: { id: contactId, organizationId: orgId },
        select: { id: true },
      }),
    ]);
    if (!campaign) throw new Error("Campaign not found");
    if (!contact) throw new Error("Contact not found");

    // Check if a draft already exists for this campaign+contact with followUpNumber 0
    const existing = await db.outreach.findFirst({
      where: {
        campaignId,
        contactId,
        followUpNumber: 0,
      },
    });

    if (existing) {
      await db.outreach.update({
        where: { id: existing.id },
        data: { subject, body, generatedByAI, status: OutreachStatus.draft },
      });
    } else {
      await db.outreach.create({
        data: {
          campaignId,
          contactId,
          subject,
          body,
          generatedByAI,
          followUpNumber: 0,
          status: OutreachStatus.draft,
        },
      });
    }

    return {
      revalidate: [`/campaigns/${campaignId}`],
      revalidateTags: [
        `campaign:${campaignId}`,
        `contact:${contactId}`,
        `stats:${orgId}`,
      ],
    };
  }
);

export const updateOutreachDraft = action(
  "updateOutreachDraft",
  async (outreachId: string, subject: string, body: string) => {
    const orgId = await requireOrgId();
    const existing = await db.outreach.findFirst({
      where: { id: outreachId, campaign: { organizationId: orgId } },
      select: { campaignId: true, contactId: true },
    });
    if (!existing) throw new Error("Outreach not found");

    await db.outreach.update({
      where: { id: outreachId },
      data: { subject, body },
    });

    return {
      revalidate: [`/campaigns/${existing.campaignId}`],
      revalidateTags: [
        `campaign:${existing.campaignId}`,
        `contact:${existing.contactId}`,
      ],
    };
  }
);

export const approveOutreach = action("approveOutreach", async (outreachId: string) => {
  const orgId = await requireOrgId();
  const existing = await db.outreach.findFirst({
    where: { id: outreachId, campaign: { organizationId: orgId } },
    select: { campaignId: true, contactId: true },
  });
  if (!existing) throw new Error("Outreach not found");

  await db.outreach.update({
    where: { id: outreachId },
    data: { status: OutreachStatus.approved },
  });

  return {
    revalidate: [`/campaigns/${existing.campaignId}`],
    revalidateTags: [
      `campaign:${existing.campaignId}`,
      `contact:${existing.contactId}`,
      `stats:${orgId}`,
    ],
  };
});

export const bulkApproveOutreaches = action(
  "bulkApproveOutreaches",
  async (campaignId: string) => {
    const orgId = await requireOrgId();
    const campaign = await db.campaign.findFirst({
      where: { id: campaignId, organizationId: orgId },
      select: { id: true },
    });
    if (!campaign) throw new Error("Campaign not found");

    await db.outreach.updateMany({
      where: {
        campaignId,
        status: OutreachStatus.draft,
        followUpNumber: 0,
      },
      data: { status: OutreachStatus.approved },
    });

    return {
      revalidate: [`/campaigns/${campaignId}`],
      revalidateTags: [`campaign:${campaignId}`, `stats:${orgId}`],
    };
  }
);

export const revertOutreachToDraft = action(
  "revertOutreachToDraft",
  async (outreachId: string) => {
    const orgId = await requireOrgId();
    const existing = await db.outreach.findFirst({
      where: { id: outreachId, campaign: { organizationId: orgId } },
      select: { campaignId: true, contactId: true },
    });
    if (!existing) throw new Error("Outreach not found");

    await db.outreach.update({
      where: { id: outreachId },
      data: { status: OutreachStatus.draft },
    });

    return {
      revalidate: [`/campaigns/${existing.campaignId}`],
      revalidateTags: [
        `campaign:${existing.campaignId}`,
        `contact:${existing.contactId}`,
        `stats:${orgId}`,
      ],
    };
  }
);

export const deleteOutreach = action("deleteOutreach", async (outreachId: string) => {
  const orgId = await requireOrgId();
  const outreach = await db.outreach.findFirst({
    where: { id: outreachId, campaign: { organizationId: orgId } },
    select: { campaignId: true, contactId: true },
  });

  if (!outreach) {
    throw new Error("Outreach not found");
  }

  await db.outreach.delete({
    where: { id: outreachId },
  });

  return {
    revalidate: [`/campaigns/${outreach.campaignId}`],
    revalidateTags: [
      `campaign:${outreach.campaignId}`,
      `contact:${outreach.contactId}`,
      `stats:${orgId}`,
    ],
  };
});

export const suggestContacts = action("suggestContacts", async (campaignId: string) => {
  const orgId = await requireOrgId();
  const config = await getAIConfig(orgId);
  if (!config) {
    throw new Error("No AI provider configured. Add an API key in environment variables.");
  }

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
    include: { client: true },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  if (!campaign.brief) {
    throw new Error("Campaign brief is required to suggest contacts");
  }

  // Get all contacts in the organization that are NOT already in this campaign
  const existingContactIds = await db.campaignContact
    .findMany({
      where: { campaignId },
      select: { contactId: true },
    })
    .then((cc: { contactId: string }[]) => cc.map((c) => c.contactId));

  // P1-4: select only the columns the prompt actually uses. Was loading
  // every column for every contact in the org and feeding the row to the
  // model verbatim. Also cap at 500 — the prompt becomes useless above
  // that and a 50K-row org would blow the context window anyway.
  const contacts = await db.contact.findMany({
    where: {
      organizationId: orgId,
      id: { notIn: existingContactIds.length > 0 ? existingContactIds : undefined },
    },
    select: { id: true, name: true, outlet: true, beat: true, tier: true },
    take: 500,
  });

  if (contacts.length === 0) {
    throw new Error("No available contacts to suggest. All contacts are already in this campaign.");
  }

  const prompt = buildContactSuggestionPrompt(
    campaign.brief,
    campaign.client.name,
    campaign.client.industry,
    contacts.map((c) => ({
      id: c.id,
      name: c.name,
      outlet: c.outlet ?? "",
      beat: c.beat ?? "",
      tier: c.tier ?? "",
    }))
  );

  const response = await generateText(config, {
    systemPrompt: "You are a PR strategist. Respond only with valid JSON.",
    userPrompt: prompt,
    temperature: 0.3,
    maxTokens: 1024,
  });

  // Parse JSON from response — handle potential markdown code blocks
  let jsonStr = response.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const suggestions = JSON.parse(jsonStr) as { contactId: string; reason: string }[];

  return { data: { suggestions } };
});

/**
 * Atomically claim an approved outreach for sending. Returns true if this
 * caller acquired the claim, false if another sender (the cron, or a
 * concurrent manual click) got there first. The cron uses its own claim
 * path (`claimDueOutreaches`); this is only for the manual / bulk paths.
 */
async function claimForManualSend(outreachId: string, orgId: string): Promise<boolean> {
  const result = await db.outreach.updateMany({
    where: {
      id: outreachId,
      status: OutreachStatus.approved,
      claimedAt: null,
      campaign: { organizationId: orgId },
    },
    data: { claimedAt: new Date() },
  });
  return result.count > 0;
}

export async function sendOutreachForOrg(outreachId: string, orgId: string) {
  // H-4: atomically take the claim before resolving the mailbox or doing
  // any work. Two parallel manual sends used to both pass the read-only
  // check and dual-deliver.
  const claimed = await claimForManualSend(outreachId, orgId);
  if (!claimed) {
    throw new Error("Outreach is not approved or is already being sent");
  }
  try {
    const account = await requireEmailAccount(orgId);
    const token = await providerFor(account).getValidToken(account.id);
    return await sendOutreachWithAccount(outreachId, orgId, account, token);
  } catch (err) {
    // H-5: record the failure (increment counter, store error, either
    // release the claim or transition to terminal `failed` at threshold).
    await recordSendFailure(outreachId, err).catch(() => {});
    throw err;
  }
}

/**
 * Per-row send variant used by the cron worker, which resolves
 * `EmailAccount` + access token ONCE per org and reuses them across many
 * sends to avoid the per-row `requireEmailAccount` + `getValidToken`
 * roundtrips.
 */
export async function sendOutreachWithAccount(
  outreachId: string,
  orgId: string,
  account: EmailAccount,
  token: string
) {
  const outreach = await loadSendableOutreach(outreachId, orgId);
  await assertNotSuppressed(outreach, orgId);
  const bodyHtml = renderOutreachHtml(outreach.body, account);
  const provider = providerFor(account);
  const sent = await provider.send(token, {
    to: outreach.contact.email!,
    subject: outreach.subject,
    bodyHtml,
  });
  await markOutreachSent(outreach.id, account.provider, sent);
  await logSentInteraction(outreach);

  return {
    revalidate: [`/campaigns/${outreach.campaignId}`, "/outreach"],
    revalidateTags: [
      `campaign:${outreach.campaignId}`,
      `contact:${outreach.contactId}`,
      `stats:${orgId}`,
    ],
  };
}

/** Resolves an org's email account + a fresh access token in one call. */
export async function resolveOrgEmailAccount(
  orgId: string
): Promise<{ account: EmailAccount; token: string }> {
  const account = await requireEmailAccount(orgId);
  const token = await providerFor(account).getValidToken(account.id);
  return { account, token };
}

export const sendOutreach = action("sendOutreach", async (outreachId: string) => {
  const orgId = await requireOrgId();
  return sendOutreachForOrg(outreachId, orgId);
});

export const scheduleOutreach = action(
  "scheduleOutreach",
  async (outreachId: string, scheduledAtIso: string) => {
    const orgId = await requireOrgId();
    const scheduledAt = new Date(scheduledAtIso);
    if (!isFinite(+scheduledAt) || scheduledAt <= new Date()) {
      throw new Error("Scheduled time must be a valid future date");
    }
    const existing = await db.outreach.findFirst({
      where: { id: outreachId, campaign: { organizationId: orgId } },
      select: { campaignId: true, contactId: true, status: true },
    });
    if (!existing) throw new Error("Outreach not found");
    if (existing.status !== OutreachStatus.approved) {
      // Scheduling must not bypass the approval gate; require the user to
      // approve the draft explicitly before they can schedule a send.
      throw new Error("Outreach must be approved before scheduling");
    }
    await db.outreach.update({
      where: { id: outreachId },
      data: {
        scheduledAt,
        claimedAt: null,
      },
    });
    return {
      revalidate: [`/campaigns/${existing.campaignId}`],
      revalidateTags: [
        `campaign:${existing.campaignId}`,
        `contact:${existing.contactId}`,
        `stats:${orgId}`,
      ],
    };
  }
);

export const cancelScheduledOutreach = action(
  "cancelScheduledOutreach",
  async (outreachId: string) => {
    const orgId = await requireOrgId();
    const existing = await db.outreach.findFirst({
      where: { id: outreachId, campaign: { organizationId: orgId } },
      select: { campaignId: true, contactId: true, status: true },
    });
    if (!existing) throw new Error("Outreach not found");
    // B-6: only `approved` rows can be unscheduled. Without this, a
    // sent/replied row could have its scheduledAt cleared (UI cosmetic
    // bug, but worth blocking).
    if (existing.status !== OutreachStatus.approved) {
      throw new Error("Only approved outreach can be unscheduled");
    }
    await db.outreach.update({
      where: { id: outreachId },
      data: { scheduledAt: null, claimedAt: null },
    });
    return {
      revalidate: [`/campaigns/${existing.campaignId}`],
      revalidateTags: [
        `campaign:${existing.campaignId}`,
        `contact:${existing.contactId}`,
      ],
    };
  }
);

async function loadSendableOutreach(
  id: string,
  orgId: string
): Promise<SendableOutreach> {
  // The claim handshake is now done by the caller (cron's
  // `claimDueOutreaches` or `claimForManualSend`); a `claimedAt: null`
  // filter here would reject already-claimed rows in the cron path.
  const outreach = await db.outreach.findFirst({
    where: { id, campaign: { organizationId: orgId } },
    include: { contact: true, campaign: true },
  });
  if (!outreach) {
    throw new Error("Outreach not found");
  }
  if (outreach.status !== OutreachStatus.approved) {
    throw new Error("Outreach must be approved before sending");
  }
  if (!outreach.contact.email) {
    throw new Error("Contact has no email address");
  }
  return outreach;
}

async function assertNotSuppressed(
  outreach: SendableOutreach,
  orgId: string
): Promise<void> {
  const email = outreach.contact.email!.trim().toLowerCase();
  const suppressed = await db.suppression.findFirst({
    where: { organizationId: orgId, email },
  });
  if (suppressed) {
    throw new Error(`Address is on the suppression list (${suppressed.reason})`);
  }
}

async function requireEmailAccount(orgId: string): Promise<EmailAccount> {
  const account = await db.emailAccount.findFirst({
    where: { user: { organizationId: orgId } },
  });
  if (!account) throw new Error("Connect your email account in Settings first");
  return account;
}

function renderOutreachHtml(body: string, account: EmailAccount): string {
  // Body is plain text typed (or token-rendered) by the user; HTML-escape
  // before paragraph wrapping or any `<script>`/`<img onerror>` payload
  // becomes live HTML in the recipient's inbox.
  const paragraphHtml = body
    .split(/\n\n+/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const fontFamilyDefault =
    account.provider === "google"
      ? "Arial, Helvetica, sans-serif"
      : "Aptos, Calibri, sans-serif";
  const fontSizeDefault = account.provider === "google" ? "13px" : "11pt";
  // Account-stored fonts are written by setManualSignature/resolveStyle,
  // both of which can be poisoned (an attacker-controlled signature could
  // store `Arial; "><script>...`). Validate against an allow-list so a
  // bad value falls back rather than breaking out of the style attribute.
  const fontFamily = safeFontFamily(account.fontFamily, fontFamilyDefault);
  const fontSize = safeFontSize(account.fontSize, fontSizeDefault);
  const signature = sanitizeSignatureHtml(account.signatureHtml);

  const wrap = (inner: string) =>
    `<div style="font-family:${fontFamily};font-size:${fontSize};color:#1f2937">${inner}</div>`;

  return signature ? wrap(paragraphHtml) + wrap(signature) : wrap(paragraphHtml);
}

async function markOutreachSent(
  id: string,
  provider: string,
  sent: SendResult
): Promise<void> {
  await db.outreach.update({
    where: { id },
    data: {
      status: OutreachStatus.sent,
      sentAt: new Date(),
      sentVia: provider === "google" ? "gmail" : "microsoft_graph",
      messageId: sent.messageId,
      threadId: sent.threadId,
    },
  });
}

async function logSentInteraction(outreach: SendableOutreach): Promise<void> {
  await db.interaction.create({
    data: {
      type: "email_sent",
      contactId: outreach.contactId,
      campaignId: outreach.campaignId,
      organizationId: outreach.campaign.organizationId,
      date: new Date(),
      summary: outreach.subject,
    },
  });
}

export async function sendBulkOutreach(campaignId: string) {
  const orgId = await requireOrgId();
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
    select: { id: true },
  });
  if (!campaign) throw new Error("Campaign not found");

  const approved = await db.outreach.findMany({
    where: {
      campaignId,
      status: OutreachStatus.approved,
    },
    select: { id: true },
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const outreach of approved) {
    const result = await sendOutreach(outreach.id);
    if ("success" in result && result.success) {
      sent++;
    } else {
      failed++;
      if ("error" in result && result.error) {
        errors.push(result.error);
      }
    }
  }

  return { sent, failed, errors };
}
