"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addRunsheetEntry,
  updateRunsheetEntry,
  deleteRunsheetEntry,
  reorderRunsheetEntries,
} from "@/actions/event-actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

interface RunsheetEntry {
  id: string;
  time: string;
  endTime: string | null;
  activity: string;
  assignee: string | null;
  location: string | null;
  notes: string | null;
  order: number;
}

interface RunsheetEditorProps {
  eventDetailId: string;
  entries: RunsheetEntry[];
}

function EntryForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: RunsheetEntry;
  onSave: (fd: FormData) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onSave(fd);
      }}
      style={{
        padding: 12,
        borderRadius: 8,
        border: "1px solid var(--border-custom)",
        backgroundColor: "var(--page-bg)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted-custom)", display: "block", marginBottom: 2 }}>
            Time *
          </label>
          <input
            name="time"
            type="time"
            required
            defaultValue={initial?.time ?? ""}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--border-custom)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted-custom)", display: "block", marginBottom: 2 }}>
            End time
          </label>
          <input
            name="endTime"
            type="time"
            defaultValue={initial?.endTime ?? ""}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--border-custom)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, color: "var(--text-muted-custom)", display: "block", marginBottom: 2 }}>
          Activity *
        </label>
        <input
          name="activity"
          type="text"
          required
          defaultValue={initial?.activity ?? ""}
          style={{
            width: "100%",
            padding: "6px 8px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid var(--border-custom)",
            backgroundColor: "var(--card-bg)",
            color: "var(--text-primary)",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted-custom)", display: "block", marginBottom: 2 }}>
            Assignee
          </label>
          <input
            name="assignee"
            type="text"
            defaultValue={initial?.assignee ?? ""}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--border-custom)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted-custom)", display: "block", marginBottom: 2 }}>
            Location
          </label>
          <input
            name="location"
            type="text"
            defaultValue={initial?.location ?? ""}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: 13,
              borderRadius: 6,
              border: "1px solid var(--border-custom)",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, color: "var(--text-muted-custom)", display: "block", marginBottom: 2 }}>
          Notes
        </label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={initial?.notes ?? ""}
          style={{
            width: "100%",
            padding: "6px 8px",
            fontSize: 13,
            borderRadius: 6,
            border: "1px solid var(--border-custom)",
            backgroundColor: "var(--card-bg)",
            color: "var(--text-primary)",
            resize: "vertical",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button type="submit" variant="primary" size="sm" disabled={isPending}>
          Save
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function RunsheetEditor({ eventDetailId, entries }: RunsheetEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd(fd: FormData) {
    fd.set("eventDetailId", eventDetailId);
    startTransition(async () => {
      await addRunsheetEntry(fd);
      setShowAddForm(false);
      router.refresh();
    });
  }

  function handleUpdate(entryId: string, fd: FormData) {
    startTransition(async () => {
      await updateRunsheetEntry(entryId, fd);
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(entryId: string) {
    startTransition(async () => {
      await deleteRunsheetEntry(entryId);
      router.refresh();
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const newEntries = [...entries];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newEntries.length) return;
    [newEntries[index], newEntries[swapIndex]] = [newEntries[swapIndex], newEntries[index]];
    const newIds = newEntries.map((e) => e.id);
    startTransition(async () => {
      await reorderRunsheetEntries(newIds);
      router.refresh();
    });
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button
          variant="primary"
          size="sm"
          icon="plus"
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
          }}
        >
          Add entry
        </Button>
      </div>

      {showAddForm && (
        <EntryForm
          onSave={handleAdd}
          onCancel={() => setShowAddForm(false)}
          isPending={isPending}
        />
      )}

      {entries.length === 0 && !showAddForm && (
        <div
          style={{
            textAlign: "center",
            padding: "30px 20px",
            color: "var(--text-muted-custom)",
            fontSize: 13,
          }}
        >
          No runsheet entries yet. Add your first entry to start planning the day.
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ position: "relative", paddingLeft: 20 }}>
          {/* Vertical timeline line */}
          <div
            style={{
              position: "absolute",
              left: 5,
              top: 8,
              bottom: 8,
              width: 2,
              backgroundColor: "var(--border-custom)",
              borderRadius: 1,
            }}
          />

          {entries.map((entry, index) => (
            <div key={entry.id} style={{ position: "relative", marginBottom: 4 }}>
              {/* Timeline dot */}
              <div
                style={{
                  position: "absolute",
                  left: -18,
                  top: 10,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent-custom)",
                  border: "2px solid var(--card-bg)",
                }}
              />

              {editingId === entry.id ? (
                <EntryForm
                  initial={entry}
                  onSave={(fd) => handleUpdate(entry.id, fd)}
                  onCancel={() => setEditingId(null)}
                  isPending={isPending}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border-custom)",
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                        {entry.time}
                      </span>
                      {entry.endTime && (
                        <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
                          — {entry.endTime}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
                      {entry.activity}
                    </div>
                    {entry.assignee && (
                      <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                        Assigned to: {entry.assignee}
                      </div>
                    )}
                    {entry.location && (
                      <div style={{ fontSize: 12, color: "var(--text-muted-custom)" }}>
                        {entry.location}
                      </div>
                    )}
                    {entry.notes && (
                      <div style={{ fontSize: 12, color: "var(--text-muted-custom)", fontStyle: "italic" }}>
                        {entry.notes}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
                    <button
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0 || isPending}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        border: "none",
                        backgroundColor: "transparent",
                        color: index === 0 ? "var(--border-custom)" : "var(--text-muted-custom)",
                        cursor: index === 0 ? "default" : "pointer",
                        borderRadius: 4,
                      }}
                    >
                      <span style={{ fontSize: 10 }}>&#9650;</span>
                    </button>
                    <button
                      onClick={() => handleMove(index, "down")}
                      disabled={index === entries.length - 1 || isPending}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        border: "none",
                        backgroundColor: "transparent",
                        color:
                          index === entries.length - 1
                            ? "var(--border-custom)"
                            : "var(--text-muted-custom)",
                        cursor: index === entries.length - 1 ? "default" : "pointer",
                        borderRadius: 4,
                      }}
                    >
                      <span style={{ fontSize: 10 }}>&#9660;</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(entry.id);
                        setShowAddForm(false);
                      }}
                      disabled={isPending}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        border: "none",
                        backgroundColor: "transparent",
                        color: "var(--text-muted-custom)",
                        cursor: "pointer",
                        borderRadius: 4,
                      }}
                    >
                      <Icon name="edit" size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={isPending}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 22,
                        height: 22,
                        border: "none",
                        backgroundColor: "transparent",
                        color: "var(--text-muted-custom)",
                        cursor: "pointer",
                        borderRadius: 4,
                      }}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
