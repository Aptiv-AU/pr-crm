// Prisma cuid() default: "c" + 24 chars. cuid2 is lowercase alnum, ~24-32 chars.
const CUID_RE = /^c[a-z0-9]{20,}$/;

export function isCuid(value: string): boolean {
  return CUID_RE.test(value);
}
