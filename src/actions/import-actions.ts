"use server";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import type { MappedContact } from "@/lib/import/contact-import";
import { slugify, ensureUniqueSlug } from "@/lib/slug/slugify";

const MAX_IMPORT_ROWS = 5000;
const UPDATE_CHUNK = 100;

type ExistingMergeRow = {
  id: string;
  email: string | null;
  phone: string | null;
  outlet: string | null;
  beat: string | null;
  tier: string | null;
  instagram: string | null;
  twitter: string | null;
  linkedin: string | null;
  notes: string | null;
};

function computeInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  return initials || "?";
}

export const importContacts = action(
  "importContacts",
  async (contacts: MappedContact[]) => {
    if (contacts.length > MAX_IMPORT_ROWS) {
      throw new Error(
        `Import capped at ${MAX_IMPORT_ROWS} rows. Split large files.`
      );
    }

    const organizationId = await requireOrgId();

    // Normalise emails once (trim + lowercase; empty → null).
    const normalised = contacts.map((c) => ({
      ...c,
      email: c.email?.trim().toLowerCase() || undefined,
    }));

    // Within-batch dedup on email: last-write-wins.
    // Rationale: later rows in the CSV override earlier ones, matching the
    // merge semantics used against existing DB rows (incoming fields replace).
    const seenEmail = new Map<string, number>(); // email → index in `normalised`
    const dropped = new Set<number>(); // indices superseded by a later duplicate
    normalised.forEach((c, idx) => {
      if (!c.email) return;
      const prev = seenEmail.get(c.email);
      if (prev !== undefined) dropped.add(prev);
      seenEmail.set(c.email, idx);
    });
    const deduped = normalised.filter((_, idx) => !dropped.has(idx));
    const inBatchSkipped = dropped.size;

    // ---- Dedup pass: one findMany against existing contacts by email ----
    const emails = Array.from(
      new Set(deduped.map((c) => c.email).filter((e): e is string => !!e))
    );

    const existingByEmail = new Map<string, ExistingMergeRow>();
    if (emails.length > 0) {
      const existing = await db.contact.findMany({
        where: { organizationId, email: { in: emails } },
        select: {
          id: true,
          email: true,
          phone: true,
          outlet: true,
          beat: true,
          tier: true,
          instagram: true,
          twitter: true,
          linkedin: true,
          notes: true,
        },
      });
      for (const e of existing) {
        if (e.email) existingByEmail.set(e.email, e);
      }
    }

    // ---- Pre-fetch existing slugs for this org to drive in-memory collision checks ----
    const existingSlugs = new Set(
      (
        await db.contact.findMany({
          where: { organizationId },
          select: { slug: true },
        })
      ).map((c) => c.slug)
    );

    // ---- Partition into updates vs inserts ----
    const toUpdate: Array<{
      id: string;
      data: Prisma.ContactUpdateInput;
    }> = [];
    const toCreate: Prisma.ContactCreateManyInput[] = [];
    const reservedSlugs = new Set<string>();

    for (const c of deduped) {
      if (c.email && existingByEmail.has(c.email)) {
        const existing = existingByEmail.get(c.email)!;
        toUpdate.push({
          id: existing.id,
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
        continue;
      }

      // New contact — generate a slug via in-memory collision check.
      // Intentionally does NOT use `generateSlug` from `@/lib/slug/generate`:
      // bulk imports pre-fetch all org slugs once (above) and check in-memory
      // to avoid N DB roundtrips per row. `ensureUniqueSlug`'s `exists`
      // predicate is async but we resolve synchronously here.
      const slug = await ensureUniqueSlug(slugify(c.name), async (candidate) =>
        existingSlugs.has(candidate) || reservedSlugs.has(candidate)
      );
      reservedSlugs.add(slug);

      toCreate.push({
        organizationId,
        name: c.name,
        email: c.email ?? null,
        phone: c.phone ?? null,
        outlet: c.outlet ?? null,
        beat: c.beat ?? null,
        tier: c.tier ?? null,
        instagram: c.instagram ?? null,
        twitter: c.twitter ?? null,
        linkedin: c.linkedin ?? null,
        notes: c.notes ?? null,
        initials: computeInitials(c.name),
        avatarBg: "#1f2937",
        avatarFg: "#ffffff",
        slug,
      });
    }

    // ---- Execute: createMany for inserts, chunked $transaction for updates ----
    let created = 0;
    if (toCreate.length > 0) {
      const result = await db.contact.createMany({
        data: toCreate,
        // Belt-and-braces: the pre-fetched slug set + reservedSlugs should
        // prevent collisions, but a concurrent import could race on
        // (organizationId, slug). skipDuplicates keeps the batch atomic.
        skipDuplicates: true,
      });
      created = result.count;
    }

    let updated = 0;
    for (let i = 0; i < toUpdate.length; i += UPDATE_CHUNK) {
      const chunk = toUpdate.slice(i, i + UPDATE_CHUNK);
      await db.$transaction(
        chunk.map((u) =>
          db.contact.update({ where: { id: u.id }, data: u.data })
        )
      );
      updated += chunk.length;
    }

    // `skipped` accounts for:
    //   - within-batch email duplicates that were collapsed, and
    //   - any createMany rows silently dropped by skipDuplicates.
    const createSkipped = toCreate.length - created;
    const skipped = inBatchSkipped + createSkipped;

    return {
      data: { created, updated, skipped },
      revalidate: ["/contacts"],
      revalidateTags: [
        `contacts:${organizationId}`,
        `stats:${organizationId}`,
      ],
    };
  }
);
