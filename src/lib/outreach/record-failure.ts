import { db } from "@/lib/db";
import { OutreachStatus } from "@prisma/client";

/**
 * H-5: how many consecutive send failures before a row is moved to the
 * terminal `failed` state. A permanent error (suppressed address,
 * malformed body, hard bounce) used to retry forever.
 */
export const MAX_SEND_FAILURES = 3;

const MAX_ERROR_LEN = 1000;

/**
 * Record a failed send attempt on an outreach row.
 *
 * Increments `sendFailureCount`, stores `lastSendError` and
 * `lastSendAttemptAt`, and either:
 *   - releases the claim (`claimedAt = null`) so the cron can retry on
 *     a future tick, gated by `claimDueOutreaches`'s backoff window, or
 *   - if we've hit `MAX_SEND_FAILURES`, moves the row to the terminal
 *     `failed` status and clears `scheduledAt` so it stops appearing in
 *     the candidate set.
 *
 * Caller does not need to release the claim separately — this function
 * does both branches.
 *
 * Lives in `lib/outreach` (not `actions/outreach-actions`) so cron and
 * unit tests can use it without pulling in the "use server" + next/cache
 * + auth dependency graph.
 */
export async function recordSendFailure(
  outreachId: string,
  err: unknown
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const truncated =
    message.length > MAX_ERROR_LEN ? message.slice(0, MAX_ERROR_LEN) + "…" : message;

  const current = await db.outreach.findUnique({
    where: { id: outreachId },
    select: { sendFailureCount: true },
  });
  const nextCount = (current?.sendFailureCount ?? 0) + 1;
  const terminate = nextCount >= MAX_SEND_FAILURES;

  await db.outreach.update({
    where: { id: outreachId },
    data: {
      sendFailureCount: nextCount,
      lastSendError: truncated,
      lastSendAttemptAt: new Date(),
      ...(terminate
        ? { status: OutreachStatus.failed, claimedAt: null, scheduledAt: null }
        : { claimedAt: null }),
    },
  });
}
