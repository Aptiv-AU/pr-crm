export function stripQuotedReply(html: string): string {
  return html
    .replace(/<div class="gmail_quote"[\s\S]*?<\/div>\s*$/i, "")
    .replace(/<div id="appendonsend"[\s\S]*$/i, "")
    .replace(/<hr[^>]*id="stopSpelling"[\s\S]*$/i, "")
    .trim();
}

export function extractFontStyle(html: string): {
  fontFamily: string | null;
  fontSize: string | null;
} {
  const m = html.match(/<div[^>]*style="([^"]*)"/i);
  if (!m) return { fontFamily: null, fontSize: null };
  const style = m[1];
  const famMatch = style.match(/font-family\s*:\s*([^;]+)/i);
  const sizeMatch = style.match(/font-size\s*:\s*([^;]+)/i);
  return {
    fontFamily: famMatch ? famMatch[1].trim() : null,
    fontSize: sizeMatch ? sizeMatch[1].trim() : null,
  };
}

export function extractSignature(messages: string[], userName: string): string | null {
  // For each message, take the last ~5 lines / last <p>/<div>/<table> block.
  const trailers = messages
    .map((html) => stripQuotedReply(html))
    .map((html) => {
      const blocks = html.match(/<(?:p|div|table)[^>]*>[\s\S]*?<\/(?:p|div|table)>/gi) ?? [];
      return blocks.slice(-2).join("");
    })
    .filter((t) => t.includes(userName.split(" ")[0]) || t.includes(userName));

  if (trailers.length < 2) return null;

  // Find the longest common trailing substring across trailers — crude but effective.
  const [first, ...rest] = trailers;
  let candidate = first;
  while (candidate.length > 30) {
    if (rest.every((t) => t.includes(candidate))) return candidate;
    candidate = candidate.slice(1); // shave from the left
  }
  return null;
}
