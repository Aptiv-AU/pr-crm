"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { EventsCalendar } from "./events-calendar";

interface EventData {
  id: string;
  slug: string;
  name: string;
  status: string;
  client: { name: string; initials: string; colour: string; bgColour: string };
  eventDetail: { eventDate: string | null; venue: string | null } | null;
}

interface EventsListClientProps {
  events: EventData[];
  upcoming: EventData[];
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[d.getMonth()]}`;
}

export function EventsListClient({ events, upcoming }: EventsListClientProps) {
  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-end" style={{ marginBottom: 16 }}>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-[6px] rounded-[8px] px-[12px] py-[6px] text-[12px] font-semibold"
          style={{
            backgroundColor: "var(--accent-custom)",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          <Icon name="plus" size={12} color="#fff" />
          New event
        </Link>
      </div>

      {/* Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Calendar */}
        <div className="flex-1 min-w-0">
          <EventsCalendar events={events} />
        </div>

        {/* Right: Upcoming sidebar */}
        <div className="w-full md:w-[280px]">
          <Card style={{ padding: 16 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: 12,
              }}
            >
              Upcoming Events
            </div>

            {upcoming.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted-custom)",
                }}
              >
                No upcoming events
              </div>
            ) : (
              <div className="flex flex-col gap-[10px]">
                {upcoming.map((evt) => (
                  <Link
                    key={evt.id}
                    href={`/events/${evt.slug}`}
                    className="flex items-start gap-[8px]"
                    style={{ textDecoration: "none" }}
                  >
                    {/* Client badge */}
                    <div
                      className="shrink-0 flex items-center justify-center rounded-[4px]"
                      style={{
                        width: 16,
                        height: 16,
                        fontSize: 8,
                        fontWeight: 700,
                        backgroundColor: evt.client.bgColour,
                        color: evt.client.colour,
                        marginTop: 1,
                      }}
                    >
                      {evt.client.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {evt.name}
                      </div>
                      {evt.eventDetail?.venue && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-sub)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {evt.eventDetail.venue}
                        </div>
                      )}
                      {evt.eventDetail?.eventDate && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted-custom)",
                          }}
                        >
                          {formatShortDate(evt.eventDetail.eventDate)}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
