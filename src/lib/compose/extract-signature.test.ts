import { describe, it, expect } from "vitest";
import { extractSignature, extractFontStyle, stripQuotedReply } from "./extract-signature";

describe("stripQuotedReply", () => {
  it("strips Gmail quote blocks", () => {
    const html = `<p>Hi Jane</p><div class="gmail_quote">quoted stuff</div>`;
    expect(stripQuotedReply(html)).toBe(`<p>Hi Jane</p>`);
  });
  it("strips Outlook append-on-send blocks", () => {
    const html = `<p>Hi</p><div id="appendonsend"></div><hr><p>quoted</p>`;
    expect(stripQuotedReply(html)).toBe(`<p>Hi</p>`);
  });
  it("strips plaintext -- signature separator", () => {
    const html = `Hi there\n-- \nScott\nPressroom`;
    expect(stripQuotedReply(html)).toBe("Hi there\n-- \nScott\nPressroom"); // separator kept; extractor uses it
  });
});

describe("extractFontStyle", () => {
  it("pulls font-family + size from outermost styled div", () => {
    const html = `<div style="font-family:Aptos,sans-serif;font-size:11pt"><p>Hi</p></div>`;
    const { fontFamily, fontSize } = extractFontStyle(html);
    expect(fontFamily).toContain("Aptos");
    expect(fontSize).toBe("11pt");
  });
  it("returns nulls on unstyled body", () => {
    const { fontFamily, fontSize } = extractFontStyle("<p>Hi</p>");
    expect(fontFamily).toBeNull();
    expect(fontSize).toBeNull();
  });
});

describe("extractSignature", () => {
  it("returns trailing block consistent across messages containing user's name", () => {
    const userName = "Scott White";
    const msgs = [
      `<p>Hi Jane</p><p>Pitch content</p><p>—<br>Scott White<br>Publicist<br>scott@pressroom.co</p>`,
      `<p>Hi Bob</p><p>Different pitch</p><p>—<br>Scott White<br>Publicist<br>scott@pressroom.co</p>`,
      `<p>Hey Amy</p><p>Another pitch</p><p>—<br>Scott White<br>Publicist<br>scott@pressroom.co</p>`,
    ];
    const sig = extractSignature(msgs, userName);
    expect(sig).toContain("Scott White");
    expect(sig).toContain("Publicist");
  });
  it("returns null if no stable signature found", () => {
    const msgs = ["<p>Hi</p>", "<p>Hello</p>"];
    expect(extractSignature(msgs, "Scott White")).toBeNull();
  });
});
