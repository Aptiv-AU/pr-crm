"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";

export const createOrUpdateEventDetail = action(
  "createOrUpdateEventDetail",
  async (campaignId: string, formData: FormData) => {
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

  const eventDetail = await db.eventDetail.findUnique({
    where: { id: eventDetailId },
    select: { campaignId: true },
  });

  const revalidate: string[] = [];
  if (eventDetail) {
    revalidate.push(
      "/events",
      `/events/${eventDetail.campaignId}`,
      `/campaigns/${eventDetail.campaignId}`
    );
  }
  return { revalidate };
});

export const updateRunsheetEntry = action(
  "updateRunsheetEntry",
  async (entryId: string, formData: FormData) => {
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

    const entry = await db.runsheetEntry.findUnique({
      where: { id: entryId },
      include: { eventDetail: { select: { campaignId: true } } },
    });

    const revalidate: string[] = [];
    if (entry) {
      revalidate.push(
        "/events",
        `/events/${entry.eventDetail.campaignId}`,
        `/campaigns/${entry.eventDetail.campaignId}`
      );
    }
    return { revalidate };
  }
);

export const deleteRunsheetEntry = action("deleteRunsheetEntry", async (entryId: string) => {
  const entry = await db.runsheetEntry.findUnique({
    where: { id: entryId },
    include: { eventDetail: { select: { campaignId: true } } },
  });

  if (!entry) {
    throw new Error("Runsheet entry not found");
  }

  await db.runsheetEntry.delete({
    where: { id: entryId },
  });

  return {
    revalidate: [
      "/events",
      `/events/${entry.eventDetail.campaignId}`,
      `/campaigns/${entry.eventDetail.campaignId}`,
    ],
  };
});

export const reorderRunsheetEntries = action(
  "reorderRunsheetEntries",
  async (entryIds: string[]) => {
    await db.$transaction(
      entryIds.map((id, i) =>
        db.runsheetEntry.update({
          where: { id },
          data: { order: i },
        })
      )
    );

    const revalidate: string[] = [];
    if (entryIds.length > 0) {
      const entry = await db.runsheetEntry.findUnique({
        where: { id: entryIds[0] },
        include: { eventDetail: { select: { campaignId: true } } },
      });

      if (entry) {
        revalidate.push(
          "/events",
          `/events/${entry.eventDetail.campaignId}`,
          `/campaigns/${entry.eventDetail.campaignId}`
        );
      }
    }
    return { revalidate };
  }
);

export const updateGuestRsvp = action(
  "updateGuestRsvp",
  async (campaignContactId: string, status: string) => {
    const campaignContact = await db.campaignContact.findUnique({
      where: { id: campaignContactId },
      select: { campaignId: true },
    });

    if (!campaignContact) {
      throw new Error("Campaign contact not found");
    }

    await db.campaignContact.update({
      where: { id: campaignContactId },
      data: { status },
    });

    return {
      revalidate: [
        "/events",
        `/events/${campaignContact.campaignId}`,
        `/campaigns/${campaignContact.campaignId}`,
      ],
    };
  }
);
