import { describe, it, expect } from "vitest";
import { buildSegmentWhere, type SegmentFilter } from "./filter";

describe("buildSegmentWhere", () => {
  it("returns base org clause with no filters", () => {
    const where = buildSegmentWhere("org1", {});
    expect(where).toMatchObject({ organizationId: "org1" });
  });
  it("adds tag AND filter (every tag must match)", () => {
    const filter: SegmentFilter = { tagIds: ["t1", "t2"] };
    const where = buildSegmentWhere("org1", filter);
    expect(where.AND).toHaveLength(2);
  });
  it("adds outlet IN clause", () => {
    const where = buildSegmentWhere("org1", { outlets: ["Vogue", "GQ"] });
    expect(where.outlet).toEqual({ in: ["Vogue", "GQ"] });
  });
  it("adds case-insensitive search on name, email, outlet", () => {
    const where = buildSegmentWhere("org1", { search: "jane" });
    expect(where.OR).toEqual(expect.arrayContaining([
      { name: { contains: "jane", mode: "insensitive" } },
    ]));
  });
});
