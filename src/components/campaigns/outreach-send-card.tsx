"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { ContactAvatar } from "@/components/shared/contact-avatar";
import { Button } from "@/components/ui/button";
import {
  sendOutreach,
  approveOutreach,
  cancelScheduledOutreach,
} from "@/actions/outreach-actions";
import { addSuppression } from "@/actions/suppression-actions";
import { ScheduleModal } from "@/components/outreach/schedule-modal";

interface OutreachSendCardProps {
  outreach: {
    id: string;
    subject: string;
    body: string;
    status: string;
    sentAt: string | null;
    scheduledAt?: string | null;
    followUpNumber: number;
    contact: {
      id: string;
      name: string;
      initials: string;
      avatarBg: string;
      avatarFg: string;
      photo?: string | null;
      email: string | null;
      outlet: string | null;
    };
  };
  emailConnected: boolean;
  isSuppressed?: boolean;
}

export function OutreachSendCard({ outreach, emailConnected, isSuppressed }: OutreachSendCardProps) {
  const [isPending, startTransition] = useTransition();
  const [suppressed, setSuppressed] = useState(!!isSuppressed);
  const [showSchedule, setShowSchedule] = useState(false);
  const { contact } = outreach;

  function handleCancelSchedule() {
    startTransition(async () => {
      await cancelScheduledOutreach(outreach.id);
    });
  }

  const scheduledLabel = outreach.scheduledAt
    ? new Date(outreach.scheduledAt).toLocaleString("en-AU", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  function handleAddToSuppression() {
    if (!contact.email) return;
    startTransition(async () => {
      const res = await addSuppression({
        email: contact.email!,
        reason: "reply_request",
        note: outreach.sentAt ? `From reply on ${outreach.sentAt}` : "From reply",
      });
      if ("success" in res && res.success) {
        setSuppressed(true);
      }
    });
  }

  function handleSend() {
    startTransition(async () => {
      await sendOutreach(outreach.id);
    });
  }

  function handleApproveAndSend() {
    startTransition(async () => {
      await approveOutreach(outreach.id);
      await sendOutreach(outreach.id);
    });
  }

  const sentDate = outreach.sentAt
    ? new Date(outreach.sentAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Follow-up draft
  if (outreach.followUpNumber > 0 && outreach.status === "draft") {
    return (
      <div
        style={{
          border: "1px solid var(--border-custom)",
          borderRadius: 10,
          padding: 16,
          backgroundColor: "var(--card-bg)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--amber)",
            marginBottom: 8,
          }}
        >
          Follow-up #{outreach.followUpNumber}
        </div>
        <div className="flex items-center gap-[8px]" style={{ marginBottom: 8 }}>
          <ContactAvatar contact={contact} size={26} />
          <div className="min-w-0">
            <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
              {contact.name}
            </div>
            {contact.outlet && (
              <div className="text-[11px]" style={{ color: "var(--text-sub)" }}>
                {contact.outlet}
              </div>
            )}
          </div>
        </div>
        <div
          className="text-[13px] font-medium"
          style={{ color: "var(--text-primary)", marginBottom: 4 }}
        >
          {outreach.subject}
        </div>
        <div
          className="text-[13px]"
          style={{
            color: "var(--text-sub)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          {outreach.body}
        </div>
        <Button
          variant="primary"
          size="sm"
          icon="mail"
          onClick={handleApproveAndSend}
          disabled={isPending || !contact.email || !emailConnected}
        >
          {isPending ? "Sending..." : "Approve & Send"}
        </Button>
      </div>
    );
  }

  // Approved — ready to send
  if (outreach.status === "approved") {
    return (
      <div
        style={{
          border: "1px solid var(--border-custom)",
          borderRadius: 10,
          padding: 16,
          backgroundColor: "var(--card-bg)",
        }}
      >
        <div className="flex items-center gap-[8px]" style={{ marginBottom: 8 }}>
          <ContactAvatar contact={contact} size={26} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
              {contact.name}
            </div>
            {contact.email && (
              <div className="text-[12px]" style={{ color: "var(--text-sub)" }}>
                {contact.email}
              </div>
            )}
            {contact.outlet && (
              <div className="text-[11px]" style={{ color: "var(--text-sub)" }}>
                {contact.outlet}
              </div>
            )}
          </div>
        </div>
        <div
          className="text-[13px] font-medium"
          style={{ color: "var(--text-primary)", marginBottom: 12 }}
        >
          {outreach.subject}
        </div>
        {scheduledLabel && (
          <div
            className="text-[12px]"
            style={{ color: "var(--text-sub)", marginBottom: 10 }}
          >
            Scheduled for {scheduledLabel}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="primary"
            size="sm"
            icon="mail"
            onClick={handleSend}
            disabled={isPending || !contact.email || !emailConnected}
          >
            {isPending ? "Sending..." : "Send now"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowSchedule(true)}
            disabled={isPending || !contact.email || !emailConnected}
          >
            {scheduledLabel ? "Reschedule" : "Schedule"}
          </Button>
          {scheduledLabel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelSchedule}
              disabled={isPending}
            >
              Cancel schedule
            </Button>
          )}
        </div>
        <ScheduleModal
          open={showSchedule}
          outreachId={outreach.id}
          initialIso={outreach.scheduledAt ?? null}
          onClose={() => setShowSchedule(false)}
        />
      </div>
    );
  }

  // Sent — awaiting reply
  if (outreach.status === "sent") {
    return (
      <div
        style={{
          border: "1px solid var(--border-custom)",
          borderRadius: 10,
          padding: 16,
          backgroundColor: "var(--card-bg)",
        }}
      >
        <div className="flex items-center gap-[8px]" style={{ marginBottom: 8 }}>
          <ContactAvatar contact={contact} size={26} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
              {contact.name}
            </div>
            {contact.outlet && (
              <div className="text-[11px]" style={{ color: "var(--text-sub)" }}>
                {contact.outlet}
              </div>
            )}
          </div>
          <div className="flex items-center gap-[6px] shrink-0">
            <Badge variant="outreach">Sent</Badge>
            {sentDate && (
              <span className="text-[11px]" style={{ color: "var(--text-muted-custom)" }}>
                {sentDate}
              </span>
            )}
          </div>
        </div>
        <div
          className="text-[13px] font-medium"
          style={{ color: "var(--text-primary)", marginBottom: 4 }}
        >
          {outreach.subject}
        </div>
        <div className="text-[12px]" style={{ color: "var(--text-muted-custom)" }}>
          Awaiting reply
        </div>
      </div>
    );
  }

  // Replied
  if (outreach.status === "replied") {
    return (
      <div
        style={{
          border: "1px solid var(--border-custom)",
          borderLeft: "3px solid var(--green)",
          borderRadius: 10,
          padding: 16,
          backgroundColor: "var(--card-bg)",
        }}
      >
        <div className="flex items-center gap-[8px]" style={{ marginBottom: 8 }}>
          <ContactAvatar contact={contact} size={26} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
              {contact.name}
            </div>
            {contact.outlet && (
              <div className="text-[11px]" style={{ color: "var(--text-sub)" }}>
                {contact.outlet}
              </div>
            )}
          </div>
          <div className="flex items-center gap-[6px] shrink-0">
            <Badge variant="active">Replied</Badge>
            {sentDate && (
              <span className="text-[11px]" style={{ color: "var(--text-muted-custom)" }}>
                {sentDate}
              </span>
            )}
          </div>
        </div>
        <div className="text-[13px] font-medium" style={{ color: "var(--text-primary)", marginBottom: 10 }}>
          {outreach.subject}
        </div>
        {contact.email && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="default"
              size="sm"
              onClick={handleAddToSuppression}
              disabled={isPending || suppressed}
            >
              {suppressed ? "On suppression list" : "Add to suppression list"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Default fallback (other statuses like "draft" with followUpNumber 0)
  return null;
}
