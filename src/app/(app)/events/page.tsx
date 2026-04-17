import { db } from "@/lib/db";
import { getEventCampaigns } from "@/lib/queries/event-queries";
import { EventsListClient } from "@/components/events/events-list-client";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  const campaigns = await getEventCampaigns(org.id);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const serialized = campaigns.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    status: c.status,
    client: c.client,
    eventDetail: c.eventDetail
      ? {
          eventDate: c.eventDetail.eventDate
            ? c.eventDetail.eventDate.toISOString()
            : null,
          venue: c.eventDetail.venue,
        }
      : null,
  }));

  const upcoming = serialized.filter((e) => {
    if (!e.eventDetail?.eventDate) return false;
    const d = new Date(e.eventDetail.eventDate);
    return d >= now && d <= thirtyDaysFromNow;
  });

  return <EventsListClient events={serialized} upcoming={upcoming} />;
}
