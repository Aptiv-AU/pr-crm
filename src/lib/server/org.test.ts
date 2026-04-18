import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth() — requireOrgId() only depends on the session shape.
const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));
// db import in org.ts is no longer used post-fallback-removal, but the module
// still imports it indirectly through nothing. Provide a harmless stub.
vi.mock("@/lib/db", () => ({ db: {} }));

import { requireOrgId } from "./org";

describe("requireOrgId", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("returns organizationId when session has one", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "u1", organizationId: "org_abc" },
    });
    await expect(requireOrgId()).resolves.toBe("org_abc");
  });

  it("throws Unauthorized when no session", async () => {
    authMock.mockResolvedValueOnce(null);
    await expect(requireOrgId()).rejects.toThrow("Unauthorized");
  });

  it("throws when session has no organizationId", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "u1" } });
    await expect(requireOrgId()).rejects.toThrow("Unauthorized");
  });

  it("throws when organizationId is null", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "u1", organizationId: null },
    });
    await expect(requireOrgId()).rejects.toThrow("Unauthorized");
  });
});
