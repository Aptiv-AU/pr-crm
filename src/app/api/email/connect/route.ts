import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthUrl } from "@/lib/email/microsoft-graph";

export async function GET() {
  try {
    // Generate a random state string
    const state = crypto.randomUUID();

    // Store state in a cookie for verification
    const cookieStore = await cookies();
    cookieStore.set("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    // Build redirect URI
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const redirectUri = `${baseUrl}/api/email/callback`;

    // Get Microsoft auth URL and redirect
    const authUrl = getAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Email connect error:", error);
    return NextResponse.redirect(
      new URL("/settings?email=error", process.env.NEXTAUTH_URL || "http://localhost:3000")
    );
  }
}
