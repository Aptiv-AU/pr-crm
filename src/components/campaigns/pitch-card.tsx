"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateOutreachDraft, approveOutreach, revertOutreachToDraft, deleteOutreach } from "@/actions/outreach-actions";
import { listTemplates, applyTemplateToOutreach } from "@/actions/template-actions";
import { Badge } from "@/components/ui/badge";
import { ContactAvatar } from "@/components/shared/contact-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

interface PitchCardProps {
  outreach: {
    id: string;
    subject: string;
    body: string;
    status: string;
    generatedByAI: boolean;
    contact: {
      id: string;
      name: string;
      initials: string;
      avatarBg: string;
      avatarFg: string;
      photo?: string | null;
      publication: string | null;
    };
  };
  onRegenerate: (contactId: string) => void;
}

export function PitchCard({ outreach, onRegenerate }: PitchCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(outreach.subject);
  const [body, setBody] = useState(outreach.body);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const isApproved = outreach.status === "approved";

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templatesList, setTemplatesList] = useState<
    { id: string; name: string }[] | null
  >(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (!templatesOpen || templatesList !== null) return;
    setTemplatesLoading(true);
    listTemplates()
      .then((rows) => {
        setTemplatesList(rows.map((r) => ({ id: r.id, name: r.name })));
        setTemplatesLoading(false);
      })
      .catch(() => {
        setTemplatesList([]);
        setTemplatesLoading(false);
      });
  }, [templatesOpen, templatesList]);

  function handleApplyTemplate(templateId: string) {
    setTemplatesOpen(false);
    setTemplateError(null);
    setApplyingTemplate(true);
    startTransition(async () => {
      const result = await applyTemplateToOutreach(outreach.id, templateId);
      setApplyingTemplate(false);
      if (result.error) {
        setTemplateError(result.error);
        return;
      }
      if (result.subject !== undefined) setSubject(result.subject);
      if (result.body !== undefined) setBody(result.body);
      router.refresh();
    });
  }

  function handleSave() {
    setEditing(false);
    if (subject !== outreach.subject || body !== outreach.body) {
      startTransition(async () => {
        await updateOutreachDraft(outreach.id, subject, body);
        router.refresh();
      });
    }
  }

  function handleApprove() {
    startTransition(async () => {
      await approveOutreach(outreach.id);
      router.refresh();
    });
  }

  function handleUnapprove() {
    startTransition(async () => {
      await revertOutreachToDraft(outreach.id);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteOutreach(outreach.id);
      router.refresh();
    });
  }

  return (
    <Card
      style={{
        padding: 16,
        opacity: isPending ? 0.6 : 1,
        borderLeft: isApproved ? "3px solid var(--green)" : undefined,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <ContactAvatar contact={outreach.contact} size={26} />
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
          {outreach.contact.name}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
          {outreach.contact.publication}
        </span>
        <div style={{ flex: 1 }} />
        {outreach.generatedByAI && (
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="sparkle" size={12} color="var(--accent-text)" />
            <span style={{ fontSize: 11, color: "var(--accent-text)" }}>AI</span>
          </div>
        )}
        <Badge variant={isApproved ? "active" : "draft"}>
          {isApproved ? "approved" : "draft"}
        </Badge>
      </div>

      {/* Subject */}
      {editing ? (
        <input
          ref={subjectRef}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={handleSave}
          style={{
            width: "100%",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            backgroundColor: "var(--page-bg)",
            border: "1px solid var(--border-custom)",
            borderRadius: 6,
            padding: "6px 8px",
            marginBottom: 8,
            outline: "none",
          }}
        />
      ) : (
        <div
          onClick={() => !isApproved && setEditing(true)}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 8,
            cursor: isApproved ? "default" : "pointer",
            borderRadius: 4,
            padding: "2px 0",
          }}
        >
          {subject || "(no subject)"}
        </div>
      )}

      {/* Body */}
      {editing ? (
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={handleSave}
          style={{
            width: "100%",
            fontSize: 13,
            color: "var(--text-primary)",
            backgroundColor: "var(--page-bg)",
            border: "1px solid var(--border-custom)",
            borderRadius: 6,
            padding: "8px",
            marginBottom: 12,
            minHeight: 120,
            resize: "vertical",
            outline: "none",
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
      ) : (
        <div
          onClick={() => !isApproved && setEditing(true)}
          style={{
            fontSize: 13,
            color: "var(--text-primary)",
            whiteSpace: "pre-wrap",
            marginBottom: 12,
            cursor: isApproved ? "default" : "pointer",
            lineHeight: 1.5,
            padding: "2px 0",
          }}
        >
          {body || "(no body)"}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {isApproved ? (
          <>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--green)" }}>
              Approved ✓
            </span>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="xs" onClick={handleUnapprove}>
              Unapprove
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" size="sm" onClick={handleApprove}>
              Approve
            </Button>
            <Button variant="ghost" size="sm" icon="sparkle" onClick={() => onRegenerate(outreach.contact.id)}>
              Regenerate
            </Button>
            <div style={{ position: "relative" }}>
              <Button
                variant="ghost"
                size="sm"
                icon="mail"
                onClick={() => setTemplatesOpen((v) => !v)}
                disabled={applyingTemplate}
              >
                {applyingTemplate ? "Loading..." : "Load template"}
              </Button>
              {templatesOpen && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "100%",
                    marginTop: 4,
                    zIndex: 10,
                    minWidth: 220,
                    backgroundColor: "var(--card-bg)",
                    border: "1px solid var(--border-custom)",
                    borderRadius: 8,
                    padding: 4,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  }}
                >
                  {templatesLoading && (
                    <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted-custom)" }}>
                      Loading…
                    </div>
                  )}
                  {!templatesLoading && templatesList && templatesList.length === 0 && (
                    <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted-custom)" }}>
                      No templates yet.{" "}
                      <a href="/settings/templates" style={{ color: "var(--accent-custom)" }}>
                        Create one
                      </a>
                    </div>
                  )}
                  {!templatesLoading &&
                    templatesList?.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleApplyTemplate(t.id)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 10px",
                          fontSize: 12,
                          borderRadius: 5,
                          color: "var(--text-primary)",
                          backgroundColor: "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--page-bg)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {t.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
            {templateError && (
              <span className="text-[11px]" style={{ color: "var(--amber)" }}>
                {templateError}
              </span>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="sm" icon="close" onClick={handleDelete}>
              Delete
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
