/**
 * Parse a YYYY-MM-DD (or other Date-parseable) string defensively.
 * Returns `undefined` for missing or unparseable values rather than throwing,
 * so bad URL input degrades gracefully.
 */
export function parseDate(v: string | undefined): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isFinite(+d) ? d : undefined;
}
