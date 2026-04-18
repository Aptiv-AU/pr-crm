import { db } from "@/lib/db";
import { OutreachStatus } from "@prisma/client";

/** A claim older than this is treated as stuck and re-eligible for sending. */
const STALE_CLAIM_MS = 15 * 60 * 1000;

/**
 * Atomically claim due outreaches for sending. Stamps `claimedAt = now` on
 * matching rows in ONE UPDATE, then returns the claimed ids + their orgIds.
 *
 * `FOR UPDATE SKIP LOCKED` is critical: two overlapping cron runs cannot
 * claim the same row. Prisma's `updateMany` does not return rows on
 * Postgres, so we drop to `$queryRaw`.
 *
 * Stale-claim recovery: a row whose `claimedAt` is older than
 * `STALE_CLAIM_MS` is reclaimable. This protects against a worker that
 * crashed mid-send and never released its claim — without this branch the
 * row would sit forever in approved+scheduled+claimed limbo.
 */
export async function claimDueOutreaches(
  now: Date,
  limit = 50
): Promise<Array<{ id: string; orgId: string }>> {
  const staleCutoff = new Date(now.getTime() - STALE_CLAIM_MS);
  const rows = await db.$queryRaw<Array<{ id: string; orgId: string }>>`
    UPDATE "Outreach" o
    SET "claimedAt" = ${now}
    FROM "Campaign" c
    WHERE o.id IN (
      SELECT o2.id FROM "Outreach" o2
      WHERE o2.status = ${OutreachStatus.approved}::"OutreachStatus"
        AND o2."scheduledAt" IS NOT NULL
        AND o2."scheduledAt" <= ${now}
        AND (o2."claimedAt" IS NULL OR o2."claimedAt" < ${staleCutoff})
      ORDER BY o2."scheduledAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    AND o."campaignId" = c.id
    RETURNING o.id AS id, c."organizationId" AS "orgId"
  `;
  return rows;
}
