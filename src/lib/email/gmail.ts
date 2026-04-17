import { google } from "googleapis";
import { db } from "@/lib/db";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/userinfo.email",
];

function oauthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}

/**
 * Build the Google OAuth authorization URL.
 */
export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const client = oauthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // force refresh token
    scope: SCOPES,
    state,
  });
}

/**
 * Exchange an authorization code for tokens, then fetch the user's email.
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const client = oauthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const userinfo = google.oauth2({ version: "v2", auth: client });
  const { data } = await userinfo.userinfo.get();
  return {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token!,
    expiresAt: new Date(tokens.expiry_date ?? Date.now() + 3500 * 1000),
    email: data.email!,
  };
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const client = oauthClient("");
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return {
    accessToken: credentials.access_token!,
    expiresAt: new Date(credentials.expiry_date ?? Date.now() + 3500 * 1000),
  };
}

/**
 * Get a valid access token for a Google EmailAccount, refreshing if needed.
 */
export async function getValidGoogleToken(emailAccountId: string): Promise<string> {
  const acct = await db.emailAccount.findUnique({ where: { id: emailAccountId } });
  if (!acct) throw new Error("email account not found");

  const bufferMs = 5 * 60 * 1000;
  if (acct.expiresAt.getTime() - Date.now() > bufferMs) return acct.accessToken;

  const refreshed = await refreshGoogleToken(acct.refreshToken);
  await db.emailAccount.update({
    where: { id: emailAccountId },
    data: {
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    },
  });
  return refreshed.accessToken;
}

/**
 * Send an email via Gmail. Returns the message id and the Gmail thread id
 * (thread id is stored in Outreach.conversationId — same semantics).
 */
export async function sendGmail(
  accessToken: string,
  { to, subject, bodyHtml }: { to: string; subject: string; bodyHtml: string },
): Promise<{ messageId: string; threadId: string }> {
  const client = oauthClient("");
  client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: client });

  // Encode subject as RFC 2047 if it contains non-ASCII characters so MIME
  // parsers don't mangle it.
  const encodedSubject = /[^\x20-\x7E]/.test(subject)
    ? `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`
    : subject;

  const raw = Buffer.from(
    [
      `To: ${to}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `Subject: ${encodedSubject}`,
      "",
      bodyHtml,
    ].join("\r\n"),
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  return { messageId: data.id!, threadId: data.threadId! };
}

/**
 * Get replies in a Gmail thread after a given date, excluding messages from
 * the user's own email. Returned shape matches Microsoft's
 * `getConversationReplies` so `checkForReplies` can treat both identically.
 */
export async function getGmailThreadReplies(
  accessToken: string,
  threadId: string,
  afterDate: Date,
): Promise<
  {
    id: string;
    from: string;
    receivedDateTime: string;
    bodyPreview: string;
  }[]
> {
  const client = oauthClient("");
  client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: client });

  // Resolve current user's email so we can filter out messages we sent.
  let userEmail = "";
  try {
    const { data: profile } = await gmail.users.getProfile({ userId: "me" });
    userEmail = (profile.emailAddress ?? "").toLowerCase();
  } catch {
    // fall through — if we can't get the profile, don't filter
  }

  const { data: thread } = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["From", "Subject", "Date"],
  });

  const afterMs = afterDate.getTime();

  const messages = thread.messages ?? [];

  return messages
    .map((msg) => {
      const headers = msg.payload?.headers ?? [];
      const fromHeader =
        headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";
      // Extract bare email from "Name <email@x>" form
      const fromEmail = (fromHeader.match(/<([^>]+)>/)?.[1] ?? fromHeader)
        .trim()
        .toLowerCase();
      const internalMs = msg.internalDate ? Number(msg.internalDate) : 0;
      return {
        id: msg.id ?? "",
        fromEmail,
        fromDisplay: fromHeader,
        internalMs,
        snippet: msg.snippet ?? "",
      };
    })
    .filter((m) => m.internalMs > afterMs)
    .filter((m) => !userEmail || m.fromEmail !== userEmail)
    .sort((a, b) => b.internalMs - a.internalMs)
    .map((m) => ({
      id: m.id,
      from: m.fromEmail || m.fromDisplay,
      receivedDateTime: new Date(m.internalMs).toISOString(),
      bodyPreview: m.snippet,
    }));
}
