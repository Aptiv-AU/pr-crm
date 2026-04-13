"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createOrUpdateEventDetail(
  campaignId: string,
  formData: FormData
) {
  try {
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

    revalidatePath("/events");
    revalidatePath(`/events/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("createOrUpdateEventDetail error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to save event detail",
    };
  }
}

export async function addRunsheetEntry(formData: FormData) {
  try {
    const eventDetailId = formData.get("eventDetailId") as string | null;
    const time = formData.get("time") as string | null;
    const endTime = formData.get("endTime") as string | null;
    const activity = formData.get("activity") as string | null;
    const assignee = formData.get("assignee") as string | null;
    const location = formData.get("location") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!eventDetailId || !time || !activity) {
      return { error: "Event detail, time, and activity are required" };
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

    if (eventDetail) {
      revalidatePath("/events");
      revalidatePath(`/events/${eventDetail.campaignId}`);
      revalidatePath(`/campaigns/${eventDetail.campaignId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("addRunsheetEntry error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to add runsheet entry",
    };
  }
}

export async function updateRunsheetEntry(
  entryId: string,
  formData: FormData
) {
  try {
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

    if (entry) {
      revalidatePath("/events");
      revalidatePath(`/events/${entry.eventDetail.campaignId}`);
      revalidatePath(`/campaigns/${entry.eventDetail.campaignId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("updateRunsheetEntry error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update runsheet entry",
    };
  }
}

export async function deleteRunsheetEntry(entryId: string) {
  try {
    const entry = await db.runsheetEntry.findUnique({
      where: { id: entryId },
      include: { eventDetail: { select: { campaignId: true } } },
    });

    if (!entry) {
      return { error: "Runsheet entry not found" };
    }

    await db.runsheetEntry.delete({
      where: { id: entryId },
    });

    revalidatePath("/events");
    revalidatePath(`/events/${entry.eventDetail.campaignId}`);
    revalidatePath(`/campaigns/${entry.eventDetail.campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("deleteRunsheetEntry error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete runsheet entry",
    };
  }
}

export async function reorderRunsheetEntries(entryIds: string[]) {
  try {
    await db.$transaction(
      entryIds.map((id, i) =>
        db.runsheetEntry.update({
          where: { id },
          data: { order: i },
        })
      )
    );

    // Look up campaignId from first entry for revalidation
    if (entryIds.length > 0) {
      const entry = await db.runsheetEntry.findUnique({
        where: { id: entryIds[0] },
        include: { eventDetail: { select: { campaignId: true } } },
      });

      if (entry) {
        revalidatePath("/events");
        revalidatePath(`/events/${entry.eventDetail.campaignId}`);
        revalidatePath(`/campaigns/${entry.eventDetail.campaignId}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("reorderRunsheetEntries error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to reorder runsheet entries",
    };
  }
}

export async function updateGuestRsvp(
  campaignContactId: string,
  status: string
) {
  try {
    const campaignContact = await db.campaignContact.findUnique({
      where: { id: campaignContactId },
      select: { campaignId: true },
    });

    if (!campaignContact) {
      return { error: "Campaign contact not found" };
    }

    await db.campaignContact.update({
      where: { id: campaignContactId },
      data: { status },
    });

    revalidatePath("/events");
    revalidatePath(`/events/${campaignContact.campaignId}`);
    revalidatePath(`/campaigns/${campaignContact.campaignId}`);

    return { success: true };
  } catch (error) {
    console.error("updateGuestRsvp error:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update RSVP status",
    };
  }
}
