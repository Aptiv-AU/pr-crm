import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { getAuthUrl } from "@/lib/email/microsoft-graph";

export async function GET() {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/auth/signin", baseUrl));
    }

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

    const redirectUri = `${baseUrl}/api/email/callback`;

    // Get Microsoft auth URL and redirect
    const authUrl = getAuthUrl(redirectUri, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Email connect error:", error);
    return NextResponse.redirect(new URL("/settings?email=error", baseUrl));
  }
}
