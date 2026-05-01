/**
 * Minimal HTML escaping + CSS attribute sanitisation for outgoing email
 * and any place we paste user/account-controlled strings into HTML.
 *
 * Why: `renderOutreachHtml` builds an `<p>...</p>` body by concatenating the
 * raw `Outreach.body` and account-stored font CSS. Without escaping, a
 * crafted body or a poisoned signature can inject `<script>`, `<img onerror>`,
 * style payloads, or break out of the `style="..."` attribute.
 */

const FONT_FAMILY_RE = /^[A-Za-z0-9\s,'"\-]{1,200}$/;
const FONT_SIZE_RE = /^[0-9.]+(?:px|pt|em|rem|%)$/;

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeFontFamily(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  return FONT_FAMILY_RE.test(trimmed) ? trimmed : fallback;
}

export function safeFontSize(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  return FONT_SIZE_RE.test(trimmed) ? trimmed : fallback;
}
