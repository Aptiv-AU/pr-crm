import { describe, it, expect, vi, beforeEach } from "vitest";

const findUniqueMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    outreach: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
  },
}));

import { recordSendFailure, MAX_SEND_FAILURES } from "./record-failure";

describe("recordSendFailure", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    updateMock.mockReset();
  });

  it("releases the claim and increments the counter on the first failure", async () => {
    findUniqueMock.mockResolvedValueOnce({ sendFailureCount: 0 });
    updateMock.mockResolvedValueOnce({});
    await recordSendFailure("o1", new Error("boom"));

    expect(updateMock).toHaveBeenCalledTimes(1);
    const call = updateMock.mock.calls[0][0];
    expect(call.where).toEqual({ id: "o1" });
    expect(call.data.sendFailureCount).toBe(1);
    expect(call.data.lastSendError).toBe("boom");
    expect(call.data.lastSendAttemptAt).toBeInstanceOf(Date);
    expect(call.data.status).toBeUndefined();
    expect(call.data.claimedAt).toBeNull();
    expect(call.data.scheduledAt).toBeUndefined();
  });

  it("transitions to `failed` and clears the schedule at the threshold", async () => {
    findUniqueMock.mockResolvedValueOnce({ sendFailureCount: MAX_SEND_FAILURES - 1 });
    updateMock.mockResolvedValueOnce({});
    await recordSendFailure("o1", new Error("permanently broken"));

    const call = updateMock.mock.calls[0][0];
    expect(call.data.sendFailureCount).toBe(MAX_SEND_FAILURES);
    expect(call.data.status).toBe("failed");
    expect(call.data.claimedAt).toBeNull();
    expect(call.data.scheduledAt).toBeNull();
  });

  it("truncates very long error messages", async () => {
    findUniqueMock.mockResolvedValueOnce({ sendFailureCount: 0 });
    updateMock.mockResolvedValueOnce({});
    const big = "x".repeat(2000);
    await recordSendFailure("o1", new Error(big));

    const call = updateMock.mock.calls[0][0];
    expect(call.data.lastSendError.length).toBe(1001);
    expect(call.data.lastSendError.endsWith("…")).toBe(true);
  });

  it("treats a missing row as a fresh failure (count starts at 1)", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    updateMock.mockResolvedValueOnce({});
    await recordSendFailure("o1", new Error("boom"));
    const call = updateMock.mock.calls[0][0];
    expect(call.data.sendFailureCount).toBe(1);
    expect(call.data.status).toBeUndefined();
  });

  it("stringifies non-Error throw values", async () => {
    findUniqueMock.mockResolvedValueOnce({ sendFailureCount: 0 });
    updateMock.mockResolvedValueOnce({});
    await recordSendFailure("o1", "raw string");
    const call = updateMock.mock.calls[0][0];
    expect(call.data.lastSendError).toBe("raw string");
  });
});
