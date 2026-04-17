"use server";

import { db } from "@/lib/db";
import { CampaignContactStatus } from "@prisma/client";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";

async function assertCampaignInOrg(campaignId: string, orgId: string): Promise<void> {
  const found = await db.campaign.findFirst({
    where: { id: campaignId, organizationId: orgId },
    select: { id: true },
  });
  if (!found) throw new Error("Campaign not found");
}

async function assertEventDetailInOrg(
  eventDetailId: string,
  orgId: string
): Promise<string> {
  const found = await db.eventDetail.findFirst({
    where: { id: eventDetailId, campaign: { organizationId: orgId } },
    select: { campaignId: true },
  });
  if (!found) throw new Error("Event detail not found");
  return found.campaignId;
}

export const createOrUpdateEventDetail = action(
  "createOrUpdateEventDetail",
  async (campaignId: string, formData: FormData) => {
    const orgId = await requireOrgId();
    await assertCampaignInOrg(campaignId, orgId);

    const venue = formData.get("venue") as string | null;
    const eventDateStr = formData.get("eventDate") as string | null;
    const eventTime = formData.get("eventTime") as string | null;
    const guestCountStr = formData.get("guestCount") as string | null;

    const eventDate = eventDateStr ? new Date(eventDateStr) : null;
    const guestCount = guestCountStr ? parseInt(guestCountStr, 10) : null;

    await db.eventDetail.upsert({
      where: { campaignId },
      create: {
        campaignId,
        venue: venue || null,
        eventDate,
        eventTime: eventTime || null,
        guestCount: guestCount !== null && !isNaN(guestCount) ? guestCount : null,
      },
      update: {
        venue: venue || null,
        eventDate,
        eventTime: eventTime || null,
        guestCount: guestCount !== null && !isNaN(guestCount) ? guestCount : null,
      },
    });

    return {
      revalidate: [
        "/events",
        `/events/${campaignId}`,
        `/campaigns/${campaignId}`,
      ],
      revalidateTags: [`campaign:${campaignId}`],
    };
  }
);

export const addRunsheetEntry = action("addRunsheetEntry", async (formData: FormData) => {
  const eventDetailId = formData.get("eventDetailId") as string | null;
  const time = formData.get("time") as string | null;
  const endTime = formData.get("endTime") as string | null;
  const activity = formData.get("activity") as string | null;
  const assignee = formData.get("assignee") as string | null;
  const location = formData.get("location") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!eventDetailId || !time || !activity) {
    throw new Error("Event detail, time, and activity are required");
  }

  const orgId = await requireOrgId();
  const campaignId = await assertEventDetailInOrg(eventDetailId, orgId);

  const maxOrder = await db.runsheetEntry.aggregate({
    where: { eventDetailId },
    _max: { order: true },
  });

  const order = (maxOrder._max.order ?? -1) + 1;

  await db.runsheetEntry.create({
    data: {
      eventDetailId,
      time,
      endTime: endTime || null,
      activity,
      assignee: assignee || null,
      location: location || null,
      notes: notes || null,
      order,
    },
  });

  return {
    revalidate: [
      "/events",
      `/events/${campaignId}`,
      `/campaigns/${campaignId}`,
    ],
    revalidateTags: [`campaign:${campaignId}`],
  };
});

export const updateRunsheetEntry = action(
  "updateRunsheetEntry",
  async (entryId: string, formData: FormData) => {
    const orgId = await requireOrgId();
    const entry = await db.runsheetEntry.findFirst({
      where: { id: entryId, eventDetail: { campaign: { organizationId: orgId } } },
      include: { eventDetail: { select: { campaignId: true } } },
    });
    if (!entry) throw new Error("Runsheet entry not found");

    const time = formData.get("time") as string | null;
    const endTime = formData.get("endTime") as string | null;
    const activity = formData.get("activity") as string | null;
    const assignee = formData.get("assignee") as string | null;
    const location = formData.get("location") as string | null;
    const notes = formData.get("notes") as string | null;

    await db.runsheetEntry.update({
      where: { id: entryId },
      data: {
        ...(time ? { time } : {}),
        endTime: endTime || null,
        ...(activity ? { activity } : {}),
        assignee: assignee || null,
        location: location || null,
        notes: notes || null,
      },
    });

    return {
      revalidate: [
        "/events",
        `/events/${entry.eventDetail.campaignId}`,
        `/campaigns/${entry.eventDetail.campaignId}`,
      ],
      revalidateTags: [`campaign:${entry.eventDetail.campaignId}`],
    };
  }
);

export const deleteRunsheetEntry = action("deleteRunsheetEntry", async (entryId: string) => {
  const orgId = await requireOrgId();
  const entry = await db.runsheetEntry.findFirst({
    where: { id: entryId, eventDetail: { campaign: { organizationId: orgId } } },
    include: { eventDetail: { select: { campaignId: true } } },
  });
  if (!entry) throw new Error("Runsheet entry not found");

  await db.runsheetEntry.delete({
    where: { id: entryId },
  });

  return {
    revalidate: [
      "/events",
      `/events/${entry.eventDetail.campaignId}`,
      `/campaigns/${entry.eventDetail.campaignId}`,
    ],
    revalidateTags: [`campaign:${entry.eventDetail.campaignId}`],
  };
});

export const reorderRunsheetEntries = action(
  "reorderRunsheetEntries",
  async (entryIds: string[]) => {
    if (entryIds.length === 0) return { revalidate: [] };
    const orgId = await requireOrgId();

    // Preflight: every entry must belong to caller's org.
    const count = await db.runsheetEntry.count({
      where: {
        id: { in: entryIds },
        eventDetail: { campaign: { organizationId: orgId } },
      },
    });
    if (count !== entryIds.length) throw new Error("Runsheet entry not found");

    await db.$transaction(
      entryIds.map((id, i) =>
        db.runsheetEntry.update({
          where: { id },
          data: { order: i },
        })
      )
    );

    const first = await db.runsheetEntry.findUnique({
      where: { id: entryIds[0] },
      include: { eventDetail: { select: { campaignId: true } } },
    });

    const revalidate: string[] = [];
    const revalidateTags: string[] = [];
    if (first) {
      revalidate.push(
        "/events",
        `/events/${first.eventDetail.campaignId}`,
        `/campaigns/${first.eventDetail.campaignId}`
      );
      revalidateTags.push(`campaign:${first.eventDetail.campaignId}`);
    }
    return { revalidate, revalidateTags };
  }
);

export const updateGuestRsvp = action(
  "updateGuestRsvp",
  async (campaignContactId: string, status: string) => {
    if (!(status in CampaignContactStatus)) {
      throw new Error(`Invalid guest status: ${status}`);
    }
    const orgId = await requireOrgId();
    const campaignContact = await db.campaignContact.findFirst({
      where: { id: campaignContactId, campaign: { organizationId: orgId } },
      select: { campaignId: true },
    });

    if (!campaignContact) {
      throw new Error("Campaign contact not found");
    }

    await db.campaignContact.update({
      where: { id: campaignContactId },
      data: { status: status as CampaignContactStatus },
    });

    return {
      revalidate: [
        "/events",
        `/events/${campaignContact.campaignId}`,
        `/campaigns/${campaignContact.campaignId}`,
      ],
      revalidateTags: [`campaign:${campaignContact.campaignId}`],
    };
  }
);
