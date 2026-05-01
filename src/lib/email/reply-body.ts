/**
 * Pure HTML→text + quoted-reply stripping helpers used by both Gmail and
 * Microsoft Graph reply ingestion. No DB, no fetch — easy to unit test.
 */

// B-4: decode the common named entities AND any numeric entity
// (decimal `&#39;` or hex `&#x27;`). Curly-quote and `&apos;` previously
// passed through as raw strings.
const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, ent: string) => {
    if (ent[0] === "#") {
      const isHex = ent[1] === "x" || ent[1] === "X";
      const code = parseInt(ent.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return _;
      try { return String.fromCodePoint(code); } catch { return _; }
    }
    return NAMED_ENTITIES[ent.toLowerCase()] ?? _;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
  )
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
