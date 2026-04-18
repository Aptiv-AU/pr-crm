import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claimDueOutreaches } from "@/lib/outreach/schedule";
import { sendOutreachForOrg } from "@/actions/outreach-actions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  for (const row of claimed) {
    try {
      await sendOutreachForOrg(row.id, row.orgId);
      sent++;
    } catch {
      failed++;
      console.error(`[cron/send-scheduled] ${row.id} failed`);
      // Release the claim so a subsequent run can retry; keep status=approved.
      await db.outreach
        .update({ where: { id: row.id }, data: { claimedAt: null } })
        .catch(() => {});
    }
  }

  return NextResponse.json({ claimed: claimed.length, sent, failed, at: now });
}
