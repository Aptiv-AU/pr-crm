import DOMPurify from "isomorphic-dompurify";

// Conservative allowlist for email signatures: text formatting, links,
// line breaks, inline images. No scripting, forms, or remote stylesheets.
const ALLOWED_TAGS = [
  "p", "div", "span", "br", "hr", "b", "strong", "i", "em", "u",
  "a", "img", "ul", "ol", "li", "table", "tr", "td", "th", "tbody", "thead",
  "font", "small", "sub", "sup",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "style", "width", "height",
  "color", "size", "face", "class",
];

/**
 * Sanitise HTML destined for render-as-trusted (signature preview,
 * outgoing email body, DB `signatureHtml` column). Works in both Node
 * and the browser via `isomorphic-dompurify`.
 *
 * Applied at write-time (resolve-style, setManualSignature) and again at
 * render/send-time as defence in depth.
 */
export function sanitizeSignatureHtml(input: string | null | undefined): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:|cid:|data:image\/)/i,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "link", "meta", "style"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus"],
  });
}
