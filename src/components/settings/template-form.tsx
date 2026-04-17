"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { createTemplate, updateTemplate, deleteTemplate } from "@/actions/template-actions";
import { availableTokens } from "@/lib/templates/render";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface TemplateFormProps {
  templates: Template[];
}

type EditorTarget = "subject" | "body";

export function TemplateForm({ templates }: TemplateFormProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | "new">(templates[0]?.id ?? "new");

  const current = templates.find((t) => t.id === selectedId);

  const [name, setName] = useState(current?.name ?? "");
  const [subject, setSubject] = useState(current?.subject ?? "");
  const [body, setBody] = useState(current?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastEditor, setLastEditor] = useState<EditorTarget>("body");
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function handleSelect(id: string) {
    setSelectedId(id);
    if (id === "new") {
      setName("");
      setSubject("");
      setBody("");
    } else {
      const t = templates.find((t) => t.id === id);
      setName(t?.name ?? "");
      setSubject(t?.subject ?? "");
      setBody(t?.body ?? "");
    }
    setMessage(null);
  }

  function insertToken(token: string) {
    const snippet = `{{${token}}}`;
    if (lastEditor === "subject") {
      const el = subjectRef.current;
      if (!el) {
        setSubject((s) => s + snippet);
      } else {
        const start = el.selectionStart ?? subject.length;
        const end = el.selectionEnd ?? subject.length;
        const next = subject.slice(0, start) + snippet + subject.slice(end);
        setSubject(next);
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + snippet.length;
          el.setSelectionRange(pos, pos);
        });
      }
    } else {
      const el = bodyRef.current;
      if (!el) {
        setBody((s) => s + snippet);
      } else {
        const start = el.selectionStart ?? body.length;
        const end = el.selectionEnd ?? body.length;
        const next = body.slice(0, start) + snippet + body.slice(end);
        setBody(next);
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + snippet.length;
          el.setSelectionRange(pos, pos);
        });
      }
    }
    setTokenDropdownOpen(false);
  }

  async function handleSave() {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setMessage("Name, subject, and body are required");
      return;
    }
    setSaving(true);
    setMessage(null);
    const result =
      selectedId === "new"
        ? await createTemplate({ name: name.trim(), subject, body })
        : await updateTemplate(selectedId, { name: name.trim(), subject, body });
    setSaving(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setMessage("Saved");
    router.refresh();
  }

  async function handleDelete() {
    if (selectedId === "new") return;
    if (!confirm(`Delete template "${name}"?`)) return;
    setSaving(true);
    const result = await deleteTemplate(selectedId);
    setSaving(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setSelectedId("new");
    setName("");
    setSubject("");
    setBody("");
    router.refresh();
  }

  const inputStyle = {
    border: "1px solid var(--border-custom)",
    backgroundColor: "var(--page-bg)",
    color: "var(--text-primary)",
  } as const;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
      {/* Template list */}
      <Card style={{ padding: 12 }}>
        <div
          className="text-[11px] font-semibold uppercase"
          style={{ color: "var(--text-muted-custom)", marginBottom: 8, letterSpacing: 0.4 }}
        >
          Templates
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            onClick={() => handleSelect("new")}
            style={{
              textAlign: "left",
              padding: "8px 10px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 500,
              color: selectedId === "new" ? "var(--text-primary)" : "var(--text-sub)",
              backgroundColor: selectedId === "new" ? "var(--page-bg)" : "transparent",
              border: "1px dashed var(--border-custom)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="plus" size={12} />
            New template
          </button>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 7,
                fontSize: 13,
                color: selectedId === t.id ? "var(--text-primary)" : "var(--text-sub)",
                backgroundColor: selectedId === t.id ? "var(--page-bg)" : "transparent",
                border: "1px solid " + (selectedId === t.id ? "var(--border-custom)" : "transparent"),
                cursor: "pointer",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </Card>

      {/* Editor */}
      <Card style={{ padding: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <label
            className="block text-[12px] font-medium"
            style={{ color: "var(--text-sub)", marginBottom: 4 }}
          >
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Initial outreach"
            className="w-full rounded-[7px] px-[10px] py-[6px] text-[13px] outline-none"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label
            className="block text-[12px] font-medium"
            style={{ color: "var(--text-sub)", marginBottom: 4 }}
          >
            Subject
          </label>
          <input
            ref={subjectRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setLastEditor("subject")}
            placeholder="e.g. {{client.name}} x {{contact.outlet}}"
            className="w-full rounded-[7px] px-[10px] py-[6px] text-[13px] outline-none"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <label className="text-[12px] font-medium" style={{ color: "var(--text-sub)" }}>
              Body
            </label>
            <div style={{ position: "relative" }}>
              <Button
                variant="ghost"
                size="xs"
                icon="plus"
                onClick={() => setTokenDropdownOpen((v) => !v)}
              >
                Insert merge field
              </Button>
              {tokenDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: 4,
                    zIndex: 10,
                    minWidth: 200,
                    backgroundColor: "var(--card-bg)",
                    border: "1px solid var(--border-custom)",
                    borderRadius: 8,
                    padding: 4,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      color: "var(--text-muted-custom)",
                      padding: "4px 8px",
                      letterSpacing: 0.4,
                    }}
                  >
                    Insert into {lastEditor}
                  </div>
                  {availableTokens().map((t) => (
                    <button
                      key={t}
                      onClick={() => insertToken(t)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 8px",
                        fontSize: 12,
                        borderRadius: 5,
                        color: "var(--text-primary)",
                        backgroundColor: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--page-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {"{{" + t + "}}"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setLastEditor("body")}
            placeholder="Hi {{contact.firstName}},"
            className="w-full rounded-[7px] px-[10px] py-[8px] text-[13px] outline-none"
            style={{
              ...inputStyle,
              minHeight: 220,
              resize: "vertical",
              lineHeight: 1.5,
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : selectedId === "new" ? "Create template" : "Save changes"}
          </Button>
          {selectedId !== "new" && (
            <Button variant="ghost" size="sm" icon="close" onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
          )}
          {message && (
            <span
              className="text-[12px]"
              style={{
                color: message === "Saved" ? "var(--green)" : "var(--amber)",
              }}
            >
              {message}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
