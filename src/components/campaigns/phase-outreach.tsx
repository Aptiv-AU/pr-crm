"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { OutreachSendCard } from "./outreach-send-card";
import { sendBulkOutreach } from "@/actions/outreach-actions";

interface OutreachPhaseProps {
  campaignId: string;
  outreaches: {
    id: string;
    subject: string;
    body: string;
    status: string;
    sentAt: string | null;
    followUpNumber: number;
    contact: {
      id: string;
      name: string;
      initials: string;
      avatarBg: string;
      avatarFg: string;
      email: string | null;
      publication: string | null;
    };
  }[];
  emailConnected: boolean;
}

export function OutreachPhase({ campaignId, outreaches, emailConnected }: OutreachPhaseProps) {
  const [isPending, startTransition] = useTransition();

  if (!emailConnected) {
    return (
      <Card style={{ padding: 40 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            textAlign: "center",
          }}
        >
          <Icon name="mail" size={24} color="var(--text-muted-custom)" />
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
            Connect Your Email
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted-custom)", maxWidth: 340 }}>
            Connect your Outlook account to send approved pitches directly from Pressroom.
          </div>
          <a
            href="/settings"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--accent-custom)",
              textDecoration: "none",
            }}
          >
            Connect in Settings &rarr;
          </a>
        </div>
      </Card>
    );
  }

  const approved = outreaches.filter((o) => o.status === "approved");
  const sent = outreaches.filter((o) => o.status === "sent");
  const replied = outreaches.filter((o) => o.status === "replied");
  const awaitingReply = sent.length;
  const followUps = outreaches.filter((o) => o.followUpNumber > 0 && o.status === "draft");
  const sentAndReplied = [...sent, ...replied].sort((a, b) => {
    const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return dateB - dateA;
  });

  function handleSendAll() {
    startTransition(async () => {
      await sendBulkOutreach(campaignId);
    });
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Stats row */}
      <div className="flex items-center gap-[20px] flex-wrap">
        <span className="text-[12px]" style={{ color: "var(--text-sub)" }}>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {approved.length}
          </span>{" "}
          Approved
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-sub)" }}>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {sent.length}
          </span>{" "}
          Sent
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-sub)" }}>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {awaitingReply}
          </span>{" "}
          Awaiting reply
        </span>
        <span className="text-[12px]" style={{ color: "var(--text-sub)" }}>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            {replied.length}
          </span>{" "}
          Replied
        </span>
      </div>

      {/* Send All Approved button */}
      {approved.length > 0 && (
        <div>
          <Button
            variant="primary"
            size="md"
            icon="mail"
            onClick={handleSendAll}
            disabled={isPending}
          >
            {isPending ? `Sending ${approved.length}...` : `Send All Approved`}
          </Button>
        </div>
      )}

      {/* Ready to Send */}
      {approved.length > 0 && (
        <div>
          <div
            className="text-[12px] font-semibold uppercase"
            style={{ color: "var(--text-muted-custom)", marginBottom: 8 }}
          >
            Ready to Send
          </div>
          <div className="flex flex-col gap-[8px]">
            {approved.map((o) => (
              <OutreachSendCard key={o.id} outreach={o} emailConnected={emailConnected} />
            ))}
          </div>
        </div>
      )}

      {/* Sent & Tracking */}
      {sentAndReplied.length > 0 && (
        <div>
          <div
            className="text-[12px] font-semibold uppercase"
            style={{ color: "var(--text-muted-custom)", marginBottom: 8 }}
          >
            Sent &amp; Tracking
          </div>
          <div className="flex flex-col gap-[8px]">
            {sentAndReplied.map((o) => (
              <OutreachSendCard key={o.id} outreach={o} emailConnected={emailConnected} />
            ))}
          </div>
        </div>
      )}

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <div>
          <div
            className="text-[12px] font-semibold uppercase"
            style={{ color: "var(--text-muted-custom)", marginBottom: 8 }}
          >
            Follow-ups
          </div>
          <div className="flex flex-col gap-[8px]">
            {followUps.map((o) => (
              <OutreachSendCard key={o.id} outreach={o} emailConnected={emailConnected} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {approved.length === 0 && sentAndReplied.length === 0 && followUps.length === 0 && (
        <Card style={{ padding: 32 }}>
          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-muted-custom)",
            }}
          >
            No outreaches yet. Draft and approve pitches above to start sending.
          </div>
        </Card>
      )}
    </div>
  );
}
