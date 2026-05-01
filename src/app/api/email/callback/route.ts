import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/email/microsoft-graph";
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
      console.error("OAuth error from Microsoft:", error);
      return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
    }

    // Verify state matches cookie
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state")?.value;

    if (!storedState || storedState !== state) {
      console.error("OAuth state mismatch");
      return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
    }

    // Delete the state cookie
    cookieStore.delete("oauth_state");

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/email/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // M-1: scope by (userId, provider). Without the provider filter,
    // connecting Outlook would silently overwrite Gmail tokens for the
    // same user.
    const existing = await db.emailAccount.findFirst({
      where: { userId, provider: "microsoft" },
    });

    let accountId: string;
    if (existing) {
      const updated = await db.emailAccount.update({
        where: { id: existing.id },
        data: {
          email: tokens.email,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          provider: "microsoft",
        },
      });
      accountId = updated.id;
    } else {
      const created = await db.emailAccount.create({
        data: {
          userId,
          provider: "microsoft",
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
      console.warn("resolveStyle failed on Microsoft connect", e);
    }

    return NextResponse.redirect(new URL("/settings?email=connected", baseUrl));
  } catch (error) {
    console.error("Email callback error:", error);
    return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
  }
}
