import { describe, it, expect } from "vitest";
import {
  stripControlChars,
  assertSingleRfc5322Address,
} from "./gmail";

describe("stripControlChars", () => {
  it("strips CR, LF, and tab characters", () => {
    expect(stripControlChars("hello\r\nworld")).toBe("hello  world");
    expect(stripControlChars("a\tb")).toBe("a b");
    expect(stripControlChars("x\r\ny\tz")).toBe("x  y z");
  });

  it("strips low-range control characters", () => {
    expect(stripControlChars("foo\x00bar\x1fbaz")).toBe("foo bar baz");
  });

  it("trims surrounding whitespace left behind", () => {
    expect(stripControlChars("\r\n  hello  \r\n")).toBe("hello");
  });

  it("leaves clean input intact", () => {
    expect(stripControlChars("Regular subject line")).toBe("Regular subject line");
  });
});

describe("assertSingleRfc5322Address", () => {
  it("rejects CRLF header-injection attack strings", () => {
    expect(() => assertSingleRfc5322Address("a@b.com\r\nBcc: x@y.com")).toThrow();
  });

  it("rejects multiple recipients separated by comma", () => {
    expect(() => assertSingleRfc5322Address("a@b.com, c@d.com")).toThrow(
      /Multiple recipients/
    );
  });

  it("rejects multiple recipients separated by semicolon", () => {
    expect(() => assertSingleRfc5322Address("a@b.com; c@d.com")).toThrow(
      /Multiple recipients/
    );
  });

  it("rejects malformed addresses", () => {
    expect(() => assertSingleRfc5322Address("not-an-email")).toThrow(/Invalid/);
    expect(() => assertSingleRfc5322Address("missing@domain")).toThrow(/Invalid/);
    expect(() => assertSingleRfc5322Address("@nolocal.com")).toThrow(/Invalid/);
  });

  it("accepts a valid single address", () => {
    expect(assertSingleRfc5322Address("scott@example.com")).toBe(
      "scott@example.com"
    );
    expect(assertSingleRfc5322Address("first.last+tag@sub.example.co.uk")).toBe(
      "first.last+tag@sub.example.co.uk"
    );
  });

  it("cleans surrounding whitespace on accepted input", () => {
    expect(assertSingleRfc5322Address("  user@example.com  ")).toBe(
      "user@example.com"
    );
  });
});
