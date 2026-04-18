import { describe, it, expect } from "vitest";
import { isCuid } from "./resolve";

describe("isCuid", () => {
  it("recognises real cuids", () => {
    expect(isCuid("ckwabcdef0123456789abcd")).toBe(true);
  });
  it("rejects slugs", () => {
    expect(isCuid("jane-doe")).toBe(false);
    expect(isCuid("acme-ss26-launch")).toBe(false);
  });
  it("rejects empty / short strings", () => {
    expect(isCuid("")).toBe(false);
    expect(isCuid("c123")).toBe(false);
  });
});
