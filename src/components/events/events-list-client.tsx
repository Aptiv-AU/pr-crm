"use client";

import Link from "next/link";
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

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthDay(dateStr: string): { month: string; day: string } {
  const d = new Date(dateStr);
  return { month: MONTH_SHORT[d.getMonth()], day: String(d.getDate()) };
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function EventsListClient({ events, upcoming }: EventsListClientProps) {
  const featured = upcoming[0];
  const others = upcoming.slice(1, 5);

  return (
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Calendar card */}
        <div className="flex-1 min-w-0">
          <EventsCalendar events={events} />
        </div>

        {/* Right: sidebar */}
        <aside className="w-full lg:w-[360px] flex flex-col gap-6">
          {featured ? (
            <FeaturedEventCard event={featured} />
          ) : (
            <div
              className="rounded-xl p-6"
              style={{
                backgroundColor: "var(--card-bg)",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                className="text-[10px] font-black uppercase tracking-[0.14em]"
                style={{ color: "var(--text-muted-custom)" }}
              >
                Upcoming
              </div>
              <p
                className="mt-3 text-sm italic font-medium"
                style={{ color: "var(--text-sub)" }}
              >
                No events scheduled in the next 30 days.
              </p>
              <Link
                href="/campaigns"
                className="inline-flex items-center gap-2 mt-4 rounded-full px-4 py-2 text-[12px] font-bold"
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
          )}

          {others.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-2">
                <h4
                  className="text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: "var(--text-sub)" }}
                >
                  Other Upcoming
                </h4>
                <Link
                  href="/campaigns?status=event"
                  className="text-[11px] font-bold hover:underline"
                  style={{ color: "var(--accent-custom)", textDecoration: "none" }}
                >
                  View All
                </Link>
              </div>
              {others.map((evt) => (
                <UpcomingRow key={evt.id} event={evt} />
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FeaturedEventCard({ event }: { event: EventData }) {
  const dateStr = event.eventDetail?.eventDate;
  const venue = event.eventDetail?.venue;
  const until = dateStr ? daysUntil(dateStr) : null;
  const isUrgent = until !== null && until <= 7;

  return (
    <div
      className="rounded-xl p-6"
      style={{
        backgroundColor: "var(--card-bg)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div className="flex justify-between items-start mb-5">
        <div
          className="p-3 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: "var(--accent-bg)",
            color: "var(--accent-custom)",
          }}
        >
          <Icon name="events" size={24} color="var(--accent-custom)" />
        </div>
        {isUrgent && (
          <span
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.14em]"
            style={{
              backgroundColor: "var(--coral-bg)",
              color: "var(--coral)",
            }}
          >
            {until === 0 ? "Today" : until === 1 ? "Tomorrow" : `In ${until} days`}
          </span>
        )}
      </div>

      <h3
        className="text-2xl font-extrabold tracking-tight mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        {event.name}
      </h3>

      {dateStr && (
        <div
          className="flex items-center gap-2 text-sm mb-5"
          style={{ color: "var(--text-sub)" }}
        >
          <Icon name="events" size={14} color="var(--text-sub)" />
          <span className="italic font-medium">{formatFullDate(dateStr)}</span>
        </div>
      )}

      <div className="space-y-3">
        {venue && (
          <InfoRow label="Location" value={venue} iconColor={event.client.colour} />
        )}
        <InfoRow label="Client" value={event.client.name} iconColor={event.client.colour} bg={event.client.bgColour} />
      </div>

      <Link
        href={`/events/${event.slug}`}
        className="w-full mt-6 py-3 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
        style={{
          backgroundColor: "var(--accent-custom)",
          color: "#fff",
          textDecoration: "none",
        }}
      >
        Manage Event
        <Icon name="chevronR" size={16} color="#fff" />
      </Link>
    </div>
  );
}

function InfoRow({
  label,
  value,
  iconColor,
  bg,
}: {
  label: string;
  value: string;
  iconColor?: string;
  bg?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{ backgroundColor: "var(--surface-container-low)" }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{
          backgroundColor: bg ?? "var(--card-bg)",
          color: iconColor ?? "var(--text-sub)",
        }}
      >
        <Icon
          name={label.toLowerCase() === "location" ? "events" : "workspace"}
          size={14}
          color={iconColor ?? "var(--text-sub)"}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[9px] font-black uppercase tracking-[0.14em]"
          style={{ color: "var(--text-muted-custom)" }}
        >
          {label}
        </div>
        <div
          className="text-sm font-bold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function UpcomingRow({ event }: { event: EventData }) {
  const dateStr = event.eventDetail?.eventDate;
  const dm = dateStr ? formatMonthDay(dateStr) : null;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex items-center gap-4 p-4 rounded-xl transition-colors"
      style={{
        backgroundColor: "var(--card-bg)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(15, 23, 42, 0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(15, 23, 42, 0.04)";
      }}
    >
      {dm && (
        <div
          className="flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0"
          style={{
            backgroundColor: "var(--surface-container-low)",
          }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5"
            style={{ color: "var(--text-muted-custom)" }}
          >
            {dm.month}
          </span>
          <span
            className="text-lg font-black leading-none"
            style={{ color: "var(--text-primary)" }}
          >
            {dm.day}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h5
          className="text-sm font-bold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {event.name}
        </h5>
        <p
          className="text-xs italic font-medium truncate"
          style={{ color: "var(--text-sub)" }}
        >
          {event.client.name}
        </p>
      </div>
      <Icon name="chevronR" size={16} color="var(--text-muted-custom)" />
    </Link>
  );
}
