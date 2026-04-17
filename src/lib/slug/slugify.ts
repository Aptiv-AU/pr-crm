const MAX_LENGTH = 60;

export function slugify(input: string): string {
  const normalised = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const collapsed = normalised
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return collapsed.slice(0, MAX_LENGTH).replace(/-+$/g, "");
}

export async function ensureUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const seed = base || "item";
  if (!(await exists(seed))) return seed;
  let n = 2;
  while (true) {
    const candidate = `${seed}-${n}`;
    if (!(await exists(candidate))) return candidate;
    n++;
  }
}
