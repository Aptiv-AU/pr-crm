/**
 * Convert a raw enum / snake_case / kebab-case string into a Title Case label
 * suitable for filter pills, dropdown options, and badge text.
 *
 * Examples:
 *   titleCase("draft")          -> "Draft"
 *   titleCase("reply_request")  -> "Reply Request"
 *   titleCase("in-progress")    -> "In Progress"
 */
export function titleCase(s: string): string {
  if (!s) return s;
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
