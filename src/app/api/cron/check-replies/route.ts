import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkForReplies, generateFollowUps } from "@/lib/email/follow-up";

export async function GET(request: Request) {
  // Verify authorization
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
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

    for (const org of orgsWithEmail) {
      const replies = await checkForReplies(org.id);
      const followUps = await generateFollowUps(org.id);
      totalReplies += replies;
      totalFollowUps += followUps;
    }

    return NextResponse.json({
      repliesFound: totalReplies,
      followUpsGenerated: totalFollowUps,
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
