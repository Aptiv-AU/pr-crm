import { describe, it, expect } from "vitest";
import { findFuzzyMatches } from "./fuzzy-dedup";

describe("findFuzzyMatches", () => {
  it("exact email wins over fuzzy name", () => {
    const existing = [
      { id: "a", name: "Jonathan Smith", email: "jon@vogue.com", outlet: "Vogue" },
      { id: "b", name: "Different Person", email: "jane@gq.com", outlet: "GQ" },
    ];
    const incoming = [
      // Same email as 'b' but a name that fuzzy-matches 'a'.
      { name: "Jon Smith", email: "jane@gq.com", outlet: "Vogue" },
    ];
    const matches = findFuzzyMatches(incoming, existing);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({ incomingIndex: 0, matchId: "b", reason: "email" });
  });

  it("'Jon Smith' matches 'Jonathan Smith' at the same outlet", () => {
    const existing = [
      { id: "a", name: "Jonathan Smith", email: null, outlet: "Vogue" },
    ];
    const incoming = [{ name: "Jon Smith", email: null, outlet: "Vogue" }];
    const matches = findFuzzyMatches(incoming, existing);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({
      incomingIndex: 0,
      matchId: "a",
      reason: "fuzzy-name-outlet",
    });
  });

  it("'John Smith' at a different outlet does NOT match", () => {
    const existing = [
      { id: "a", name: "John Smith", email: null, outlet: "Vogue" },
    ];
    const incoming = [{ name: "John Smith", email: null, outlet: "GQ" }];
    const matches = findFuzzyMatches(incoming, existing);
    expect(matches).toHaveLength(0);
  });

  it("skips incoming rows with empty names (and no email)", () => {
    const existing = [
      { id: "a", name: "Jane Doe", email: null, outlet: "Vogue" },
    ];
    const incoming = [
      { name: "", email: null, outlet: "Vogue" },
      { name: "   ", email: null, outlet: "Vogue" },
    ];
    const matches = findFuzzyMatches(incoming, existing);
    expect(matches).toHaveLength(0);
  });

  it("matches by email even if incoming name is empty", () => {
    const existing = [
      { id: "a", name: "Jane Doe", email: "jane@ex.com", outlet: "Vogue" },
    ];
    const incoming = [{ name: "", email: "JANE@ex.com", outlet: null }];
    const matches = findFuzzyMatches(incoming, existing);
    expect(matches).toEqual([
      { incomingIndex: 0, matchId: "a", reason: "email" },
    ]);
  });

  it(
    "soft perf check: 1000 incoming x 1000 existing under generous bound",
    () => {
      const outlets = ["Vogue", "GQ", "Wired", "NYT", "Guardian"];
      const firsts = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Chris", "Pat"];
      const lasts = ["Smith", "Jones", "Brown", "Garcia", "Miller", "Davis"];

      const existing = Array.from({ length: 1000 }, (_, i) => ({
        id: `e${i}`,
        name: `${firsts[i % firsts.length]} ${lasts[(i * 3) % lasts.length]}`,
        email: `e${i}@example.com`,
        outlet: outlets[i % outlets.length],
      }));

      const incoming = Array.from({ length: 1000 }, (_, i) => ({
        // ~half match by email, half rely on fuzzy / no match.
        name: `${firsts[(i + 1) % firsts.length]} ${lasts[(i * 2) % lasts.length]}`,
        email: i % 2 === 0 ? `e${i}@example.com` : `nope${i}@example.com`,
        outlet: outlets[i % outlets.length],
      }));

      const t0 = performance.now();
      const matches = findFuzzyMatches(incoming, existing);
      const elapsed = performance.now() - t0;

      // Generous bound; the point is to catch O(N^2) regressions, not exact ms.
      expect(elapsed).toBeLessThan(2000);
      expect(matches.length).toBeGreaterThan(0);
    },
  );
});
