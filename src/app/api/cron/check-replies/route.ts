import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkForReplies, generateFollowUps } from "@/lib/email/follow-up";

const ORGS_CONCURRENCY = 3;

export async function GET(request: Request) {
  // Fail-closed: CRON_SECRET must be configured in non-dev environments.
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!cronSecret) {
    if (isDev) {
      console.warn("[cron/check-replies] CRON_SECRET not set — allowing in dev only");
    } else {
      console.warn("[cron/check-replies] CRON_SECRET not configured — refusing");
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

  try {
    // Find all organizations that have at least one EmailAccount
    const orgsWithEmail = await db.organization.findMany({
      where: {
        users: {
          some: {
            emailAccounts: {
              some: {},
            },
          },
        },
      },
      select: { id: true },
    });

    let totalReplies = 0;
    let totalFollowUps = 0;

    // Parallelise across orgs in bounded batches. Within each org, replies
    // must be detected before follow-ups are generated (so we don't follow-up
    // on threads that actually got replies) — keep that step sequential.
    // B-2: use allSettled so one org's token-refresh failure doesn't kill
    // the whole batch (and skip generateFollowUps for every other org).
    let failed = 0;
    for (let i = 0; i < orgsWithEmail.length; i += ORGS_CONCURRENCY) {
      const batch = orgsWithEmail.slice(i, i + ORGS_CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (org) => {
          const replies = await checkForReplies(org.id);
          const followUps = await generateFollowUps(org.id);
          return { replies, followUps };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          totalReplies += r.value.replies;
          totalFollowUps += r.value.followUps;
        } else {
          failed += 1;
          console.error("[cron/check-replies] org failed:", r.reason);
        }
      }
    }

    return NextResponse.json({
      repliesFound: totalReplies,
      followUpsGenerated: totalFollowUps,
      orgsFailed: failed,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Cron check-replies error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
