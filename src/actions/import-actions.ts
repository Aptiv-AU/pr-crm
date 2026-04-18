"use server";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { requireOrgId } from "@/lib/server/org";
import type { MappedContact } from "@/lib/import/contact-import";
import { findFuzzyMatches } from "@/lib/contacts/fuzzy-dedup";
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

export type DedupPreviewMatch = {
  incomingIndex: number;
  matchId: string;
  reason: "email" | "fuzzy-name-outlet";
  existing: { id: string; name: string; email: string | null; outlet: string | null };
};

/**
 * Pre-flight: report which incoming rows match existing org contacts so the
 * UI can offer "Merge" vs "Create new" per row. Email matches default to
 * merge; fuzzy-name-outlet matches default to create-new (highlighted).
 */
export const previewContactDedup = action(
  "previewContactDedup",
  async (contacts: MappedContact[]) => {
    if (contacts.length > MAX_IMPORT_ROWS) {
      throw new Error(
        `Import capped at ${MAX_IMPORT_ROWS} rows. Split large files.`
      );
    }
    const organizationId = await requireOrgId();

    const existing = await db.contact.findMany({
      where: { organizationId },
      select: { id: true, name: true, email: true, outlet: true },
    });

    const matches = findFuzzyMatches(
      contacts.map((c) => ({
        name: c.name,
        email: c.email ?? null,
        outlet: c.outlet ?? null,
      })),
      existing,
    );

    const byId = new Map(existing.map((e) => [e.id, e] as const));
    const enriched: DedupPreviewMatch[] = matches.map((m) => ({
      ...m,
      existing: byId.get(m.matchId)!,
    }));

    return { data: { matches: enriched } };
  }
);

export const importContacts = action(
  "importContacts",
  async (
    contacts: MappedContact[],
    /**
     * Indices of incoming rows the user explicitly chose to "Create new" for,
     * even though dedup found a candidate. Used for fuzzy-name-outlet matches
     * (and any email matches the user overrode).
     */
    forceCreateIndices: number[] = [],
    /**
     * Indices the user explicitly chose to merge into a specific existing
     * contact (used for fuzzy-name-outlet matches the user accepted).
     * Email matches are merged automatically without needing this map.
     */
    forceMergeMap: Record<number, string> = {},
  ) => {
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

    // Map original incoming indices into post-dedup indices so the caller's
    // forceCreateIndices (computed against the pre-flight preview, which sees
    // the original array) line up with `deduped`.
    const forceCreate = new Set<number>();
    const forceMerge = new Map<number, string>();
    {
      const force = new Set(forceCreateIndices);
      const merge = new Map(
        Object.entries(forceMergeMap).map(([k, v]) => [Number(k), v] as const)
      );
      let post = 0;
      for (let i = 0; i < normalised.length; i++) {
        if (dropped.has(i)) continue;
        if (force.has(i)) forceCreate.add(post);
        const m = merge.get(i);
        if (m) forceMerge.set(post, m);
        post++;
      }
    }

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

    // Pull existing rows for forceMerge targets (which may not have surfaced
    // via the email dedup pass).
    const existingById = new Map<string, ExistingMergeRow>();
    const mergeTargetIds = Array.from(new Set(forceMerge.values()));
    if (mergeTargetIds.length > 0) {
      const rows = await db.contact.findMany({
        where: { organizationId, id: { in: mergeTargetIds } },
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
      for (const r of rows) existingById.set(r.id, r);
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

    for (let idx = 0; idx < deduped.length; idx++) {
      const c = deduped[idx];

      // Resolve a merge target if one applies: explicit user-chosen merge
      // (fuzzy) takes precedence over implicit email match. forceCreate
      // overrides everything.
      let mergeTarget: ExistingMergeRow | undefined;
      if (!forceCreate.has(idx)) {
        const fmId = forceMerge.get(idx);
        if (fmId) mergeTarget = existingById.get(fmId);
        else if (c.email) mergeTarget = existingByEmail.get(c.email);
      }

      if (mergeTarget) {
        toUpdate.push({
          id: mergeTarget.id,
          data: {
            name: c.name,
            phone: c.phone ?? mergeTarget.phone,
            outlet: c.outlet ?? mergeTarget.outlet,
            beat: c.beat ?? mergeTarget.beat,
            tier: c.tier ?? mergeTarget.tier,
            instagram: c.instagram ?? mergeTarget.instagram,
            twitter: c.twitter ?? mergeTarget.twitter,
            linkedin: c.linkedin ?? mergeTarget.linkedin,
            notes: c.notes ?? mergeTarget.notes,
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
