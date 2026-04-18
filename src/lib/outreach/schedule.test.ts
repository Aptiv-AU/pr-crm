import { describe, it, expect, vi, beforeEach } from "vitest";

const queryRawMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}));

import { claimDueOutreaches } from "./schedule";

describe("claimDueOutreaches", () => {
  beforeEach(() => {
    queryRawMock.mockReset();
  });

  it("returns the rows the UPDATE produced", async () => {
    queryRawMock.mockResolvedValueOnce([
      { id: "o1", orgId: "org_a" },
      { id: "o2", orgId: "org_b" },
    ]);
    const now = new Date("2026-04-18T00:00:00Z");
    const rows = await claimDueOutreaches(now, 50);
    expect(rows).toEqual([
      { id: "o1", orgId: "org_a" },
      { id: "o2", orgId: "org_b" },
    ]);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });

  it("passes the timestamp and limit through to the parameterized SQL template", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    const now = new Date("2026-04-18T00:00:00Z");
    await claimDueOutreaches(now, 7);
    // Prisma tagged-template form: first arg is a TemplateStringsArray, then values.
    const call = queryRawMock.mock.calls[0];
    // Values include `now` and the LIMIT (7), plus enum literal for status.
    const values = call.slice(1);
    expect(values).toContain(now);
    expect(values).toContain(7);
  });

  it("returns an empty array when nothing is due", async () => {
    queryRawMock.mockResolvedValueOnce([]);
    const rows = await claimDueOutreaches(new Date(), 50);
    expect(rows).toEqual([]);
  });
});
