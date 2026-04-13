"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getAIConfig } from "@/lib/ai/get-config";
import { generateText } from "@/lib/ai/provider";
import { buildContactSuggestionPrompt } from "@/lib/ai/prompts";
import { getValidToken, sendMail } from "@/lib/email/microsoft-graph";

export async function saveBrief(campaignId: string, brief: string) {
  try {
    await db.campaign.update({
      where: { id: campaignId },
      data: { brief },
    });

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("saveBrief error:", error);
    return { error: error instanceof Error ? error.message : "Failed to save brief" };
  }
}

export async function createOutreachDraft(
  campaignId: string,
  contactId: string,
  subject: string,
  body: string,
  generatedByAI: boolean
) {
  try {
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

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("createOutreachDraft error:", error);
    return { error: error instanceof Error ? error.message : "Failed to create outreach draft" };
  }
}

export async function updateOutreachDraft(outreachId: string, subject: string, body: string) {
  try {
    const outreach = await db.outreach.update({
      where: { id: outreachId },
      data: { subject, body },
    });

    revalidatePath(`/campaigns/${outreach.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("updateOutreachDraft error:", error);
    return { error: error instanceof Error ? error.message : "Failed to update outreach draft" };
  }
}

export async function approveOutreach(outreachId: string) {
  try {
    const outreach = await db.outreach.update({
      where: { id: outreachId },
      data: { status: "approved" },
    });

    revalidatePath(`/campaigns/${outreach.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("approveOutreach error:", error);
    return { error: error instanceof Error ? error.message : "Failed to approve outreach" };
  }
}

export async function bulkApproveOutreaches(campaignId: string) {
  try {
    await db.outreach.updateMany({
      where: {
        campaignId,
        status: "draft",
        followUpNumber: 0,
      },
      data: { status: "approved" },
    });

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("bulkApproveOutreaches error:", error);
    return { error: error instanceof Error ? error.message : "Failed to bulk approve outreaches" };
  }
}

export async function revertOutreachToDraft(outreachId: string) {
  try {
    const outreach = await db.outreach.update({
      where: { id: outreachId },
      data: { status: "draft" },
    });

    revalidatePath(`/campaigns/${outreach.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("revertOutreachToDraft error:", error);
    return { error: error instanceof Error ? error.message : "Failed to revert outreach to draft" };
  }
}

export async function deleteOutreach(outreachId: string) {
  try {
    const outreach = await db.outreach.findUnique({
      where: { id: outreachId },
      select: { campaignId: true },
    });

    if (!outreach) {
      return { error: "Outreach not found" };
    }

    await db.outreach.delete({
      where: { id: outreachId },
    });

    revalidatePath(`/campaigns/${outreach.campaignId}`);
    return { success: true };
  } catch (error) {
    console.error("deleteOutreach error:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete outreach" };
  }
}

export async function suggestContacts(campaignId: string) {
  try {
    const config = await getAIConfig();
    if (!config) {
      return { error: "No AI provider configured. Add an API key in environment variables." };
    }

    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: { client: true },
    });

    if (!campaign) {
      return { error: "Campaign not found" };
    }

    if (!campaign.brief) {
      return { error: "Campaign brief is required to suggest contacts" };
    }

    // Get all contacts in the organization that are NOT already in this campaign
    const existingContactIds = await db.campaignContact
      .findMany({
        where: { campaignId },
        select: { contactId: true },
      })
      .then((cc) => cc.map((c) => c.contactId));

    const contacts = await db.contact.findMany({
      where: {
        organizationId: campaign.organizationId,
        id: { notIn: existingContactIds.length > 0 ? existingContactIds : undefined },
      },
    });

    if (contacts.length === 0) {
      return { error: "No available contacts to suggest. All contacts are already in this campaign." };
    }

    const prompt = buildContactSuggestionPrompt(
      campaign.brief,
      campaign.client.name,
      campaign.client.industry,
      contacts.map((c) => ({
        id: c.id,
        name: c.name,
        publication: c.publication,
        beat: c.beat,
        tier: c.tier,
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

    return { suggestions };
  } catch (error) {
    console.error("suggestContacts error:", error);
    return { error: error instanceof Error ? error.message : "Failed to suggest contacts" };
  }
}

export async function sendOutreach(outreachId: string) {
  try {
    const outreach = await db.outreach.findUnique({
      where: { id: outreachId },
      include: {
        contact: true,
        campaign: true,
      },
    });

    if (!outreach) {
      return { error: "Outreach not found" };
    }

    if (outreach.status !== "approved") {
      return { error: "Outreach must be approved before sending" };
    }

    if (!outreach.contact.email) {
      return { error: "Contact has no email address" };
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
      return { error: "Connect your email account in Settings first" };
    }

    const accessToken = await getValidToken(emailAccount.id);

    // Convert body to HTML paragraphs
    const bodyHtml = outreach.body
      .split(/\n\n+/)
      .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
      .join("");

    const result = await sendMail(accessToken, {
      to: outreach.contact.email,
      subject: outreach.subject,
      bodyHtml,
    });

    await db.outreach.update({
      where: { id: outreachId },
      data: {
        status: "sent",
        sentAt: new Date(),
        sentVia: "microsoft_graph",
        messageId: result.messageId,
        conversationId: result.conversationId,
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

    revalidatePath(`/campaigns/${outreach.campaignId}`);
    revalidatePath("/outreach");
    return { success: true };
  } catch (error) {
    console.error("sendOutreach error:", error);
    return { error: error instanceof Error ? error.message : "Failed to send outreach" };
  }
}

export async function sendBulkOutreach(campaignId: string) {
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
