"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import { getAIConfig } from "@/lib/ai/get-config";
import { generateText } from "@/lib/ai/provider";
import { buildContactSuggestionPrompt } from "@/lib/ai/prompts";
import {
  getValidToken as getValidMicrosoftToken,
  sendMail as sendViaMicrosoft,
} from "@/lib/email/microsoft-graph";
import { getValidGoogleToken, sendGmail } from "@/lib/email/gmail";

async function loadOutreachInOrg<T extends object = {}>(
  outreachId: string,
  orgId: string,
  extraInclude?: T
) {
  // Outreach belongs to a campaign belongs to an org.
  return db.outreach.findFirst({
    where: { id: outreachId, campaign: { organizationId: orgId } },
    include: { contact: true, campaign: true, ...(extraInclude ?? {}) },
  });
}

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

  return { revalidate: [`/campaigns/${campaignId}`] };
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
        data: { subject, body, generatedByAI, status: "draft" },
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
          status: "draft",
        },
      });
    }

    return { revalidate: [`/campaigns/${campaignId}`] };
  }
);

export const updateOutreachDraft = action(
  "updateOutreachDraft",
  async (outreachId: string, subject: string, body: string) => {
    const orgId = await requireOrgId();
    const existing = await db.outreach.findFirst({
      where: { id: outreachId, campaign: { organizationId: orgId } },
      select: { campaignId: true },
    });
    if (!existing) throw new Error("Outreach not found");

    await db.outreach.update({
      where: { id: outreachId },
      data: { subject, body },
    });

    return { revalidate: [`/campaigns/${existing.campaignId}`] };
  }
);

export const approveOutreach = action("approveOutreach", async (outreachId: string) => {
  const orgId = await requireOrgId();
  const existing = await db.outreach.findFirst({
    where: { id: outreachId, campaign: { organizationId: orgId } },
    select: { campaignId: true },
  });
  if (!existing) throw new Error("Outreach not found");

  await db.outreach.update({
    where: { id: outreachId },
    data: { status: "approved" },
  });

  return { revalidate: [`/campaigns/${existing.campaignId}`] };
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
        status: "draft",
        followUpNumber: 0,
      },
      data: { status: "approved" },
    });

    return { revalidate: [`/campaigns/${campaignId}`] };
  }
);

export const revertOutreachToDraft = action(
  "revertOutreachToDraft",
  async (outreachId: string) => {
    const orgId = await requireOrgId();
    const existing = await db.outreach.findFirst({
      where: { id: outreachId, campaign: { organizationId: orgId } },
      select: { campaignId: true },
    });
    if (!existing) throw new Error("Outreach not found");

    await db.outreach.update({
      where: { id: outreachId },
      data: { status: "draft" },
    });

    return { revalidate: [`/campaigns/${existing.campaignId}`] };
  }
);

export const deleteOutreach = action("deleteOutreach", async (outreachId: string) => {
  const orgId = await requireOrgId();
  const outreach = await db.outreach.findFirst({
    where: { id: outreachId, campaign: { organizationId: orgId } },
    select: { campaignId: true },
  });

  if (!outreach) {
    throw new Error("Outreach not found");
  }

  await db.outreach.delete({
    where: { id: outreachId },
  });

  return { revalidate: [`/campaigns/${outreach.campaignId}`] };
});

export const suggestContacts = action("suggestContacts", async (campaignId: string) => {
  const orgId = await requireOrgId();
  const config = await getAIConfig();
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

  const contacts = await db.contact.findMany({
    where: {
      organizationId: orgId,
      id: { notIn: existingContactIds.length > 0 ? existingContactIds : undefined },
    },
  });

  if (contacts.length === 0) {
    throw new Error("No available contacts to suggest. All contacts are already in this campaign.");
  }

  const prompt = buildContactSuggestionPrompt(
    campaign.brief,
    campaign.client.name,
    campaign.client.industry,
    contacts.map((c: typeof contacts[number]) => ({
      id: c.id,
      name: c.name,
      publication: c.outlet ?? "",
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

export const sendOutreach = action("sendOutreach", async (outreachId: string) => {
  const orgId = await requireOrgId();
  const outreach = await loadOutreachInOrg(outreachId, orgId);

  if (!outreach) {
    throw new Error("Outreach not found");
  }

  if (outreach.status !== "approved") {
    throw new Error("Outreach must be approved before sending");
  }

  if (!outreach.contact.email) {
    throw new Error("Contact has no email address");
  }

  // Suppression list check — block before any provider dispatch
  const normalised = outreach.contact.email.trim().toLowerCase();
  const suppressed = await db.suppression.findFirst({
    where: {
      organizationId: outreach.campaign.organizationId,
      email: normalised,
    },
  });
  if (suppressed) {
    throw new Error(`Address is on the suppression list (${suppressed.reason})`);
  }

  // Find an EmailAccount for the org (via user -> organization)
  const emailAccount = await db.emailAccount.findFirst({
    where: {
      user: {
        organizationId: outreach.campaign.organizationId,
      },
    },
  });

  if (!emailAccount) {
    throw new Error("Connect your email account in Settings first");
  }

  // Convert body to HTML paragraphs
  const paragraphHtml = outreach.body
    .split(/\n\n+/)
    .map((para: string) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");

  // Wrap body in the user's resolved font, then append their signature.
  // Both provider branches receive the same finished HTML.
  const fontFamily =
    emailAccount.fontFamily ??
    (emailAccount.provider === "google"
      ? "Arial, Helvetica, sans-serif"
      : "Aptos, Calibri, sans-serif");
  const fontSize =
    emailAccount.fontSize ??
    (emailAccount.provider === "google" ? "13px" : "11pt");
  const signature = emailAccount.signatureHtml ?? "";

  let bodyHtml = `<div style="font-family:${fontFamily};font-size:${fontSize};color:#1f2937">${paragraphHtml}</div>`;
  if (signature) {
    bodyHtml += `<div style="font-family:${fontFamily};font-size:${fontSize};color:#1f2937">${signature}</div>`;
  }

  // Provider dispatch. Gmail's threadId is stored in Outreach.conversationId
  // — same semantics, no extra column.
  let messageId: string;
  let conversationId: string;
  let sentVia: string;

  if (emailAccount.provider === "google") {
    const token = await getValidGoogleToken(emailAccount.id);
    const res = await sendGmail(token, {
      to: outreach.contact.email,
      subject: outreach.subject,
      bodyHtml,
    });
    messageId = res.messageId;
    conversationId = res.threadId;
    sentVia = "gmail";
  } else {
    const token = await getValidMicrosoftToken(emailAccount.id);
    const res = await sendViaMicrosoft(token, {
      to: outreach.contact.email,
      subject: outreach.subject,
      bodyHtml,
    });
    messageId = res.messageId;
    conversationId = res.conversationId;
    sentVia = "microsoft_graph";
  }

  await db.outreach.update({
    where: { id: outreachId },
    data: {
      status: "sent",
      sentAt: new Date(),
      sentVia,
      messageId,
      conversationId,
    },
  });

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

  return {
    revalidate: [`/campaigns/${outreach.campaignId}`, "/outreach"],
  };
});

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
      status: "approved",
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
