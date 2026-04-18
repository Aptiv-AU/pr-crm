import { describe, it, expect } from "vitest";
import { htmlToText, stripQuotedReply } from "./reply-body";

describe("htmlToText", () => {
  it("returns empty string for empty input", () => {
    expect(htmlToText("")).toBe("");
  });

  it("strips <style> and <script> blocks entirely", () => {
    const html = `<style>.x{color:red}</style>Hello<script>alert(1)</script> world`;
    expect(htmlToText(html)).toBe("Hello world");
  });

  it("converts <br> to newline and </p> to double newline", () => {
    expect(htmlToText("<p>Hi</p><p>There</p>")).toBe("Hi\n\nThere");
    expect(htmlToText("a<br>b<br/>c")).toBe("a\nb\nc");
  });

  it("decodes common HTML entities", () => {
    expect(htmlToText("Tom &amp; Jerry &lt;3 &quot;quoted&quot; &#39;single&#39; &nbsp;ok")).toBe(
      `Tom & Jerry <3 "quoted" 'single' ok`
    );
  });

  it("collapses excessive whitespace", () => {
    expect(htmlToText("a    b\n\n\n\nc")).toBe("a b\n\nc");
  });

  it("strips arbitrary tags", () => {
    expect(htmlToText("<div><span>hello</span> <b>world</b></div>")).toBe("hello world");
  });
});

describe("stripQuotedReply", () => {
  it("returns empty for empty input", () => {
    expect(stripQuotedReply("")).toBe("");
  });

  it("strips Outlook -----Original Message----- block", () => {
    const input = `Thanks, that works.\n\n-----Original Message-----\nFrom: Scott\nSent: Mon\nSubject: Hi\n\nOriginal text here.`;
    expect(stripQuotedReply(input)).toBe("Thanks, that works.");
  });

  it("strips Outlook From:/Sent: header block", () => {
    const input = `Sounds good.\n\nFrom: Scott White <scott@example.com>\nSent: Friday, 18 April 2026 10:00\nTo: Jane\nSubject: Pitch\n\nOriginal pitch body.`;
    expect(stripQuotedReply(input)).toBe("Sounds good.");
  });

  it("strips Gmail 'On ... wrote:' block", () => {
    const input = `Got it, will share.\n\nOn Fri, 18 Apr 2026 at 10:00, Scott White <scott@example.com> wrote:\n> original quoted text\n> more quoted text`;
    expect(stripQuotedReply(input)).toBe("Got it, will share.");
  });

  it("leaves text unchanged when no marker is present", () => {
    expect(stripQuotedReply("Just a plain reply, nothing quoted.")).toBe(
      "Just a plain reply, nothing quoted."
    );
  });
});
