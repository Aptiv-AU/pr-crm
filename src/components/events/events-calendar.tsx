"use client";

import { useState } from "react";
import Link from "next/link";

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

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday-based (Mon=0, Sun=6)
  return day === 0 ? 6 : day - 1;
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

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOfWeek(currentYear, currentMonth);
  const prevMonthDays = getDaysInMonth(
    currentMonth === 0 ? currentYear - 1 : currentYear,
    currentMonth === 0 ? 11 : currentMonth - 1
  );

  // Build calendar grid cells
  const cells: { day: number; inMonth: boolean; date: Date }[] = [];

  // Previous month trailing days
  for (let i = firstDayOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const m = currentMonth === 0 ? 11 : currentMonth - 1;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    cells.push({ day, inMonth: false, date: new Date(y, m, day) });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, date: new Date(currentYear, currentMonth, d) });
  }

  // Next month leading days to fill 6 rows
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = currentMonth === 11 ? 0 : currentMonth + 1;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    cells.push({ day: d, inMonth: false, date: new Date(y, m, d) });
  }

  // Map events by date string (YYYY-MM-DD)
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={handlePrev}
          className="cursor-pointer"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-sub)",
            background: "none",
            border: "none",
            padding: "4px 8px",
          }}
        >
          &larr; prev
        </button>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>
        <button
          type="button"
          onClick={handleNext}
          className="cursor-pointer"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--text-sub)",
            background: "none",
            border: "none",
            padding: "4px 8px",
          }}
        >
          next &rarr;
        </button>
      </div>

      {/* Day-of-week row */}
      <div className="grid grid-cols-7">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              color: "var(--text-muted-custom)",
              fontWeight: 500,
              textAlign: "center",
              padding: "4px 0",
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7"
        style={{ borderTop: "1px solid var(--border-custom)", borderLeft: "1px solid var(--border-custom)" }}
      >
        {cells.map((cell, idx) => {
          const dateKey = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, "0")}-${String(cell.date.getDate()).padStart(2, "0")}`;
          const isToday = dateKey === todayKey;
          const dayEvents = eventsByDate[dateKey] || [];

          return (
            <div
              key={idx}
              className="min-h-[50px] md:min-h-[80px]"
              style={{
                borderBottom: "1px solid var(--border-custom)",
                borderRight: "1px solid var(--border-custom)",
                padding: 4,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: !cell.inMonth
                    ? "var(--text-muted-custom)"
                    : isToday
                      ? "var(--accent-custom)"
                      : "var(--text-primary)",
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {cell.day}
              </div>
              {dayEvents.slice(0, 2).map((evt) => (
                <Link
                  key={evt.id}
                  href={`/events/${evt.slug}`}
                  style={{
                    display: "block",
                    marginTop: 2,
                    padding: "1px 4px",
                    borderRadius: 4,
                    fontSize: 10,
                    lineHeight: 1.3,
                    backgroundColor: evt.client.bgColour,
                    color: evt.client.colour,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                  }}
                >
                  {/* Full name on desktop, initials on mobile */}
                  <span className="hidden md:inline">{evt.name}</span>
                  <span className="md:hidden">{evt.client.initials}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
