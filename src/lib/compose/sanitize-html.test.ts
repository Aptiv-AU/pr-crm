import { describe, it, expect } from "vitest";
import { sanitizeSignatureHtml } from "./sanitize-html";

describe("sanitizeSignatureHtml", () => {
  it("passes plain allowed tags through", () => {
    expect(sanitizeSignatureHtml("<p>hi</p>")).toBe("<p>hi</p>");
  });

  it("returns empty string for null/undefined/empty input", () => {
    expect(sanitizeSignatureHtml(null)).toBe("");
    expect(sanitizeSignatureHtml(undefined)).toBe("");
    expect(sanitizeSignatureHtml("")).toBe("");
  });

  it("removes <script> tags entirely", () => {
    const out = sanitizeSignatureHtml("<p>hi</p><script>alert(1)</script>");
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/alert/);
    expect(out).toMatch(/<p>hi<\/p>/);
  });

  it("strips inline event handlers like onerror", () => {
    const out = sanitizeSignatureHtml('<img src="x" onerror="alert(1)">');
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/alert/);
  });

  it("keeps https links intact", () => {
    const out = sanitizeSignatureHtml('<a href="https://ex.com">link</a>');
    expect(out).toMatch(/href="https:\/\/ex\.com"/);
    expect(out).toMatch(/>link</);
  });

  it("strips javascript: hrefs", () => {
    const out = sanitizeSignatureHtml('<a href="javascript:alert(1)">link</a>');
    expect(out).not.toMatch(/javascript:/i);
    expect(out).not.toMatch(/alert/);
  });

  it("allows data:image URIs on <img>", () => {
    const payload =
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mMAAQAABQAB0A5zlwAAAABJRU5ErkJggg==" alt="dot">';
    const out = sanitizeSignatureHtml(payload);
    expect(out).toMatch(/data:image\/png;base64,/);
  });

  it("removes iframe tags", () => {
    const out = sanitizeSignatureHtml('<iframe src="https://evil.com"></iframe>');
    expect(out).not.toMatch(/<iframe/i);
  });

  it("removes <style> blocks", () => {
    const out = sanitizeSignatureHtml("<style>body{display:none}</style><p>hi</p>");
    expect(out).not.toMatch(/<style/i);
    expect(out).toMatch(/<p>hi<\/p>/);
  });
});
