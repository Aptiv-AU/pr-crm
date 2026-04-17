"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { MappedContact } from "@/lib/import/contact-import";

type ImportResult =
  | { success: true; created: number; updated: number; skipped: number }
  | { error: string };

export async function importContacts(contacts: MappedContact[]): Promise<ImportResult> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const org = await db.organization.findFirst();
  if (!org) return { error: "No organization" };

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const c of contacts) {
    try {
      if (c.email) {
        const existing = await db.contact.findFirst({
          where: { organizationId: org.id, email: c.email },
        });
        if (existing) {
          await db.contact.update({
            where: { id: existing.id },
            data: {
              name: c.name,
              phone: c.phone ?? existing.phone,
              outlet: c.outlet ?? existing.outlet,
              beat: c.beat ?? existing.beat,
              tier: c.tier ?? existing.tier,
              instagram: c.instagram ?? existing.instagram,
              twitter: c.twitter ?? existing.twitter,
              linkedin: c.linkedin ?? existing.linkedin,
              notes: c.notes ?? existing.notes,
            },
          });
          updated++;
          continue;
        }
      }

      const initials = c.name
        .split(/\s+/)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("");

      await db.contact.create({
        data: {
          organizationId: org.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          outlet: c.outlet,
          beat: c.beat,
          tier: c.tier,
          instagram: c.instagram,
          twitter: c.twitter,
          linkedin: c.linkedin,
          notes: c.notes,
          initials: initials || "?",
          avatarBg: "#1f2937",
          avatarFg: "#ffffff",
        },
      });
      created++;
    } catch (err) {
      skipped++;
      console.error("import row failed", err);
    }
  }

  revalidatePath("/contacts");
  return { success: true, created, updated, skipped };
}
