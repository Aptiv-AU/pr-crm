"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import type { MappedContact } from "@/lib/import/contact-import";
import { slugify, ensureUniqueSlug } from "@/lib/slug/slugify";

export const importContacts = action(
  "importContacts",
  async (contacts: MappedContact[]) => {
    const MAX_IMPORT_ROWS = 5000;
    if (contacts.length > MAX_IMPORT_ROWS) {
      throw new Error(`Import capped at ${MAX_IMPORT_ROWS} rows. Split large files.`);
    }

    const organizationId = await requireOrgId();

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Batch-local reservation so duplicate names in one import get -2, -3 etc.
    const reservedSlugs = new Set<string>();

    for (const c of contacts) {
      try {
        if (c.email) {
          const existing = await db.contact.findFirst({
            where: { organizationId, email: c.email },
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

        const slug = await ensureUniqueSlug(slugify(c.name), async (candidate) => {
          if (reservedSlugs.has(candidate)) return true;
          const existing = await db.contact.findFirst({
            where: { organizationId, slug: candidate },
            select: { id: true },
          });
          return existing !== null;
        });
        reservedSlugs.add(slug);

        await db.contact.create({
          data: {
            organizationId,
            name: c.name,
            slug,
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

    return {
      data: { created, updated, skipped },
      revalidate: ["/contacts"],
    };
  }
);
