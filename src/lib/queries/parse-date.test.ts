import { describe, it, expect } from "vitest";
import { parseDate } from "./parse-date";

describe("parseDate", () => {
  it("returns undefined for undefined input", () => {
    expect(parseDate(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parseDate("")).toBeUndefined();
  });

  it("parses YYYY-MM-DD into a valid Date", () => {
    const d = parseDate("2026-04-18");
    expect(d).toBeInstanceOf(Date);
    expect(d && isFinite(+d)).toBe(true);
    // Use UTC accessors — `new Date("YYYY-MM-DD")` parses as UTC midnight.
    expect(d?.getUTCFullYear()).toBe(2026);
    expect(d?.getUTCMonth()).toBe(3); // April is 3
    expect(d?.getUTCDate()).toBe(18);
  });

  it("returns undefined for unparseable input", () => {
    expect(parseDate("not-a-date")).toBeUndefined();
    expect(parseDate("2026-13-45")).toBeUndefined();
  });
});
