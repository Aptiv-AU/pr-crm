/**
 * Pure HTML→text + quoted-reply stripping helpers used by both Gmail and
 * Microsoft Graph reply ingestion. No DB, no fetch — easy to unit test.
 */

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Strip the quoted prior-message section from a plaintext reply body.
 * Handles common Outlook ("-----Original Message-----", "From: ... Sent: ...")
 * and Gmail ("On <date>, <name> wrote:") quoting markers.
 */
export function stripQuotedReply(text: string): string {
  const markers = [
    /\n-----Original Message-----[\s\S]*$/,
    /\nOn .{0,200} wrote:[\s\S]*$/,
    /\nFrom: .+\nSent: .+[\s\S]*$/,
  ];
  let result = text;
  for (const m of markers) result = result.replace(m, "");
  return result.trim();
}
