"use client";
import { useState, useTransition } from "react";
import { assignTag, removeTag, createTag } from "@/actions/tag-actions";
import { TagChip } from "./tag-chip";

type Tag = { id: string; label: string; colorBg: string; colorFg: string };

export function TagPicker({
  contactId,
  assigned,
  available,
}: {
  contactId: string;
  assigned: Tag[];
  available: Tag[];
}) {
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState("");

  function toggle(tagId: string, isAssigned: boolean) {
    startTransition(async () => {
      if (isAssigned) await removeTag(contactId, tagId);
      else await assignTag(contactId, tagId);
    });
  }

  function addNew() {
    if (!input.trim()) return;
    startTransition(async () => {
      const res = await createTag(input.trim());
      if ("tag" in res && res.tag) {
        await assignTag(contactId, res.tag.id);
      }
      setInput("");
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {assigned.map((t) => (
          <button key={t.id} onClick={() => toggle(t.id, true)}>
            <TagChip label={`× ${t.label}`} bg={t.colorBg} fg={t.colorFg} />
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {available
          .filter((t) => !assigned.some((a) => a.id === t.id))
          .map((t) => (
            <button key={t.id} onClick={() => toggle(t.id, false)} className="opacity-60 hover:opacity-100">
              <TagChip label={`+ ${t.label}`} bg={t.colorBg} fg={t.colorFg} />
            </button>
          ))}
      </div>
      <div className="flex gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="New tag…"
          className="border rounded px-2 py-1 text-sm"
        />
        <button onClick={addNew} disabled={isPending} className="text-sm border rounded px-2">
          Add
        </button>
      </div>
    </div>
  );
}
