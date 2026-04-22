"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface EventsCalendarProps {
  events: {
    id: string;
    slug: string;
    name: string;
    status: string;
    client: { name: string; initials: string; colour: string; bgColour: string };
    eventDetail: { eventDate: string | null; venue: string | null } | null;
  }[];
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function EventsCalendar({ events }: EventsCalendarProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  function handlePrev() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }
  function handleNext() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }
  function handleToday() {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOfWeek(currentYear, currentMonth);
  const prevMonthDays = getDaysInMonth(
    currentMonth === 0 ? currentYear - 1 : currentYear,
    currentMonth === 0 ? 11 : currentMonth - 1
  );

  const cells: { day: number; inMonth: boolean; date: Date }[] = [];
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    cells.push({ day, inMonth: false, date: new Date(y, m, day) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(currentYear, currentMonth, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    cells.push({ day: d, inMonth: false, date: new Date(y, m, d) });
  }

  const eventsByDate: Record<string, typeof events> = {};
  for (const event of events) {
    if (event.eventDetail?.eventDate) {
      const d = new Date(event.eventDetail.eventDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!eventsByDate[key]) eventsByDate[key] = [];
      eventsByDate[key].push(event);
    }
  }

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--card-bg)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      {/* Header */}
      <div className="px-8 py-6 flex justify-between items-center">
        <div>
          <h2
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--accent-custom)" }}
          >
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <p
            className="font-medium italic mt-1"
            style={{ color: "var(--text-sub)" }}
          >
            Editorial Schedule &amp; PR Launches
          </p>
        </div>
        <div
          className="flex items-center rounded-full p-1"
          style={{ backgroundColor: "var(--surface-container-low)" }}
        >
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous month"
            className="flex items-center justify-center w-9 h-9 rounded-full border-none cursor-pointer transition-colors"
            style={{ backgroundColor: "transparent", color: "var(--text-sub)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--card-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon name="chevronL" size={16} color="var(--text-sub)" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-4 py-2 text-sm font-bold rounded-full border-none cursor-pointer"
            style={{
              backgroundColor: "var(--card-bg)",
              color: "var(--accent-custom)",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next month"
            className="flex items-center justify-center w-9 h-9 rounded-full border-none cursor-pointer transition-colors"
            style={{ backgroundColor: "transparent", color: "var(--text-sub)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--card-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <Icon name="chevronR" size={16} color="var(--text-sub)" />
          </button>
        </div>
      </div>

      {/* Day-of-week row */}
      <div
        className="grid grid-cols-7"
        style={{ borderTop: "1px solid var(--surface-container-high)" }}
      >
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="py-4 text-center text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted-custom)" }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const dateKey = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, "0")}-${String(cell.date.getDate()).padStart(2, "0")}`;
          const isToday = dateKey === todayKey;
          const dayEvents = eventsByDate[dateKey] || [];
          const isLastCol = (idx + 1) % 7 === 0;
          const topEvent = dayEvents[0];
          const highlighted = isToday && topEvent;

          return (
            <div
              key={idx}
              className="p-3 min-h-[90px] md:min-h-[110px] transition-colors"
              style={{
                backgroundColor: !cell.inMonth
                  ? "var(--surface-container-low)"
                  : highlighted
                    ? "color-mix(in oklab, var(--accent-custom) 6%, var(--card-bg))"
                    : "var(--card-bg)",
                opacity: cell.inMonth ? 1 : 0.45,
                borderRight: isLastCol ? "none" : "1px solid var(--surface-container-high)",
                borderBottom: "1px solid var(--surface-container-high)",
              }}
              onMouseEnter={(e) => {
                if (cell.inMonth && !highlighted) {
                  e.currentTarget.style.backgroundColor = "var(--surface-container-low)";
                }
              }}
              onMouseLeave={(e) => {
                if (cell.inMonth && !highlighted) {
                  e.currentTarget.style.backgroundColor = "var(--card-bg)";
                }
              }}
            >
              <div
                className={`text-right text-sm ${isToday ? "font-extrabold" : "font-medium"}`}
                style={{
                  color: isToday ? "var(--accent-custom)" : "var(--text-primary)",
                }}
              >
                {cell.day}
              </div>
              {dayEvents.slice(0, 2).map((evt, i) => {
                const isTopOnToday = isToday && i === 0;
                return (
                  <Link
                    key={evt.id}
                    href={`/events/${evt.slug}`}
                    className="block mt-2 px-2 py-1 rounded text-[10px] font-bold truncate transition-opacity hover:opacity-80"
                    style={
                      isTopOnToday
                        ? {
                            backgroundColor: "var(--accent-custom)",
                            color: "#fff",
                            boxShadow: "0 2px 4px rgba(0, 108, 73, 0.25)",
                            textDecoration: "none",
                            padding: "4px 8px",
                            borderRadius: 8,
                          }
                        : {
                            backgroundColor: "color-mix(in oklab, " + (evt.client.bgColour ?? "var(--surface-container)") + " 60%, var(--card-bg))",
                            color: evt.client.colour ?? "var(--text-sub)",
                            borderLeft: `2px solid ${evt.client.colour ?? "var(--accent-custom)"}`,
                            textDecoration: "none",
                          }
                    }
                  >
                    <span className="hidden md:inline">{evt.name}</span>
                    <span className="md:hidden">{evt.client.initials}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
