import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete all email accounts for the authenticated user only
    await db.emailAccount.deleteMany({
      where: { userId: session.user.id },
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
