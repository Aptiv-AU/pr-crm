import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { exchangeGoogleCode } from "@/lib/email/gmail";
import { resolveStyle } from "@/lib/compose/resolve-style";

function getBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/auth/signin", baseUrl));
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("OAuth error from Google:", error);
      return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      console.error("Google OAuth state mismatch");
      return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
    }

    cookieStore.delete("google_oauth_state");

    const redirectUri = `${baseUrl}/api/email/google/callback`;
    const tokens = await exchangeGoogleCode(code, redirectUri);

    const existing = await db.emailAccount.findFirst({
      where: { userId },
    });

    let accountId: string;
    if (existing) {
      const updated = await db.emailAccount.update({
        where: { id: existing.id },
        data: {
          provider: "google",
          email: tokens.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        },
      });
      accountId = updated.id;
    } else {
      const created = await db.emailAccount.create({
        data: {
          userId,
          provider: "google",
          email: tokens.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        },
      });
      accountId = created.id;
    }

    try {
      await resolveStyle(accountId);
    } catch (e) {
      console.warn("resolveStyle failed on Google connect", e);
    }

    return NextResponse.redirect(new URL("/settings?email=connected", baseUrl));
  } catch (error) {
    console.error("Google email callback error:", error);
    return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
  }
}
