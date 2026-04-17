import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGoogleAuthUrl } from "@/lib/email/gmail";

export async function GET() {
  try {
    const state = crypto.randomUUID();

    const cookieStore = await cookies();
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const redirectUri = `${baseUrl}/api/email/google/callback`;

    const authUrl = getGoogleAuthUrl(redirectUri, state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Google email connect error:", error);
    return NextResponse.redirect(
      new URL("/settings?email=error", process.env.NEXTAUTH_URL || "http://localhost:3000"),
    );
  }
}
