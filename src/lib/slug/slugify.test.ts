import { describe, it, expect } from "vitest";
import { slugify, ensureUniqueSlug } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Jane Doe")).toBe("jane-doe");
  });
  it("strips diacritics", () => {
    expect(slugify("Café Chloé")).toBe("cafe-chloe");
  });
  it("drops non-alphanumeric chars", () => {
    expect(slugify("Smith & Co. — 2026!")).toBe("smith-co-2026");
  });
  it("collapses runs of hyphens and whitespace", () => {
    expect(slugify("  a  —  b ")).toBe("a-b");
  });
  it("caps length at 60", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBe(60);
  });
  it("returns empty string for all-unsupported input", () => {
    expect(slugify("—?!")).toBe("");
  });
});

describe("ensureUniqueSlug", () => {
  it("returns base when not taken", async () => {
    const taken = new Set<string>();
    const slug = await ensureUniqueSlug("jane-doe", (s) =>
      Promise.resolve(taken.has(s)),
    );
    expect(slug).toBe("jane-doe");
  });
  it("appends -2, -3 on collision", async () => {
    const taken = new Set(["jane-doe", "jane-doe-2"]);
    const slug = await ensureUniqueSlug("jane-doe", (s) =>
      Promise.resolve(taken.has(s)),
    );
    expect(slug).toBe("jane-doe-3");
  });
  it("falls back to 'item' if base is empty", async () => {
    const slug = await ensureUniqueSlug("", () => Promise.resolve(false));
    expect(slug).toBe("item");
  });
});
