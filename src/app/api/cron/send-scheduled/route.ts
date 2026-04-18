import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claimDueOutreaches } from "@/lib/outreach/schedule";
import {
  resolveOrgEmailAccount,
  sendOutreachWithAccount,
} from "@/actions/outreach-actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PER_ORG_CONCURRENCY = 3;

/**
 * Send up to N async tasks concurrently, in array order. Returns the
 * settled results. Inlined to avoid a runtime dependency on p-limit.
 */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        results[i] = { status: "fulfilled", value: await worker(items[i]) };
      } catch (err) {
        results[i] = { status: "rejected", reason: err };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

export async function GET(request: Request) {
  // Fail-closed: CRON_SECRET must be configured in non-dev environments.
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!cronSecret) {
    if (isDev) {
      console.warn("[cron/send-scheduled] CRON_SECRET not set — allowing in dev only");
    } else {
      console.warn("[cron/send-scheduled] CRON_SECRET not configured — refusing");
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 }
      );
    }
  } else {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const claimed = await claimDueOutreaches(now);
  let sent = 0;
  let failed = 0;

  // Group claimed rows by org so we resolve EmailAccount + access token ONCE
  // per org, then fan out sends with bounded concurrency. This avoids N
  // identical DB reads + token refreshes when an org schedules many sends
  // for the same minute.
  const byOrg = new Map<string, string[]>();
  for (const row of claimed) {
    const arr = byOrg.get(row.orgId);
    if (arr) arr.push(row.id);
    else byOrg.set(row.orgId, [row.id]);
  }

  for (const [orgId, ids] of byOrg) {
    let account: Awaited<ReturnType<typeof resolveOrgEmailAccount>>["account"];
    let token: string;
    try {
      ({ account, token } = await resolveOrgEmailAccount(orgId));
    } catch (err) {
      // Whole org can't send (no account / token refresh failed). Release
      // every claim in this batch so the next tick will retry.
      console.error(
        `[cron/send-scheduled] org ${orgId} account resolve failed:`,
        err instanceof Error ? err.message : err
      );
      failed += ids.length;
      await db.outreach
        .updateMany({ where: { id: { in: ids } }, data: { claimedAt: null } })
        .catch(() => {});
      continue;
    }

    const results = await mapLimit(ids, PER_ORG_CONCURRENCY, async (id) => {
      try {
        await sendOutreachWithAccount(id, orgId, account, token);
        return true;
      } catch (err) {
        console.error(
          `[cron/send-scheduled] ${id} failed:`,
          err instanceof Error ? err.message : err
        );
        // Release the claim so a subsequent run can retry; keep status=approved.
        await db.outreach
          .update({ where: { id }, data: { claimedAt: null } })
          .catch(() => {});
        return false;
      }
    });

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sent++;
      else failed++;
    }
  }

  return NextResponse.json({ claimed: claimed.length, sent, failed, at: now });
}
