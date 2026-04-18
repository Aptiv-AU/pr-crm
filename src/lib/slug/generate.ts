import { db } from "@/lib/db";
import { slugify, ensureUniqueSlug } from "./slugify";

type SlugModel = "contact" | "client" | "supplier" | "campaign" | "coverage";

/**
 * Generate an org-unique slug for `name` on `model`.
 *
 * Wraps `slugify` + `ensureUniqueSlug` with a DB existence probe scoped to
 * `orgId`. Pass `reserved` to pre-exclude candidates (e.g. when allocating
 * multiple slugs within one request before any have been persisted).
 *
 * Note: `importContacts` intentionally does NOT use this helper — it
 * pre-fetches all org slugs once and checks in-memory to avoid N DB
 * roundtrips per row during bulk CSV imports.
 */
export async function generateSlug(
  model: SlugModel,
  orgId: string,
  name: string,
  reserved?: Set<string>,
): Promise<string> {
  const base = slugify(name);
  return ensureUniqueSlug(base, async (candidate) => {
    if (reserved?.has(candidate)) return true;
    // Prisma's model accessor isn't generic over a string-literal union,
    // so we cast here. The union above bounds the set of valid keys.
    const result = await (db[model] as unknown as {
      findFirst: (args: {
        where: { organizationId: string; slug: string };
        select: { id: true };
      }) => Promise<{ id: string } | null>;
    }).findFirst({
      where: { organizationId: orgId, slug: candidate },
      select: { id: true },
    });
    return result !== null;
  });
}
