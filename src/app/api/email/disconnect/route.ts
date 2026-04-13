import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Find the first user's email account (temporary — no multi-user auth yet)
    const user = await db.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!user) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    // Delete all email accounts for this user
    await db.emailAccount.deleteMany({
      where: { userId: user.id },
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    return NextResponse.redirect(new URL("/settings", baseUrl), 303);
  } catch (error) {
    console.error("Email disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect email" },
      { status: 500 }
    );
  }
}
