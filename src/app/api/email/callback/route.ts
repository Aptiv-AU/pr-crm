import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { exchangeCodeForTokens } from "@/lib/email/microsoft-graph";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    if (error) {
      console.error("OAuth error from Microsoft:", error);
      return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?email=error", baseUrl)
      );
    }

    // Verify state matches cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state")?.value;

    if (!storedState || storedState !== state) {
      console.error("OAuth state mismatch");
      return NextResponse.redirect(
        new URL("/settings?email=error", baseUrl)
      );
    }

    // Delete the state cookie
    cookieStore.delete("oauth_state");

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/email/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Find the first user (temporary — no multi-user auth yet)
    const user = await db.user.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!user) {
      console.error("No user found in database");
      return NextResponse.redirect(
        new URL("/settings?email=error", baseUrl)
      );
    }

    // Upsert EmailAccount
    const existing = await db.emailAccount.findFirst({
      where: { userId: user.id },
    });

    if (existing) {
      await db.emailAccount.update({
        where: { id: existing.id },
        data: {
          email: tokens.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        },
      });
    } else {
      await db.emailAccount.create({
        data: {
          userId: user.id,
          email: tokens.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        },
      });
    }

    return NextResponse.redirect(
      new URL("/settings?email=connected", baseUrl)
    );
  } catch (error) {
    console.error("Email callback error:", error);
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
  }
}
