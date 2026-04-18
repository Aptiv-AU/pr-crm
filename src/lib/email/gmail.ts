import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { db } from "@/lib/db";
import { htmlToText, stripQuotedReply } from "./reply-body";

/**
 * Walk a Gmail MIME payload tree and collect the first text/plain and
 * text/html parts. Both top-level (no `parts`) and nested multipart messages
 * are handled.
 */
function extractGmailBodies(
  payload: gmail_v1.Schema$MessagePart | undefined,
): { plain: string | null; html: string | null } {
  let plain: string | null = null;
  let html: string | null = null;

  function decode(data: string | null | undefined): string {
    if (!data) return "";
    return Buffer.from(data, "base64url").toString("utf8");
  }

  function visit(part: gmail_v1.Schema$MessagePart | undefined) {
    if (!part) return;
    const mime = (part.mimeType ?? "").toLowerCase();
    const data = part.body?.data;
    if (mime === "text/plain" && plain === null && data) {
      plain = decode(data);
    } else if (mime === "text/html" && html === null && data) {
      html = decode(data);
    }
    if (part.parts && part.parts.length) {
      for (const child of part.parts) visit(child);
    }
  }

  visit(payload);
  return { plain, html };
}

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
 * Strip CR/LF/tabs and other control characters. Used to defuse header
 * injection into raw MIME envelopes (Gmail's send accepts raw RFC 5322).
 */
export function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\r\n\t\x00-\x1f]/g, " ").trim();
}

/**
 * Assert that `addr` is a single, well-shaped RFC 5322 address. Rejects
 * multi-recipient strings (comma/semicolon) and anything that looks ragged.
 * Not a full parser — a deliberate minimal shape check.
 */
export function assertSingleRfc5322Address(addr: string): string {
  const cleaned = stripControlChars(addr);
  if (/[,;]/.test(cleaned)) {
    throw new Error("Multiple recipients not allowed here");
  }
  if (!/^[^\s<>()[\]:;"]+@[^\s<>()[\]:;"]+\.[^\s<>()[\]:;"]+$/.test(cleaned)) {
    throw new Error(`Invalid email address: ${cleaned}`);
  }
  return cleaned;
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
 * (thread id is stored in Outreach.threadId).
 */
export async function sendGmail(
  accessToken: string,
  { to, subject, bodyHtml }: { to: string; subject: string; bodyHtml: string },
): Promise<{ messageId: string; threadId: string }> {
  // Neutralise header-injection vectors before we concatenate into raw MIME.
  const safeSubject = stripControlChars(subject);
  const safeTo = assertSingleRfc5322Address(to);

  const client = oauthClient("");
  client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: client });

  // Encode subject as RFC 2047 if it contains non-ASCII characters so MIME
  // parsers don't mangle it.
  const encodedSubject = /[^\x20-\x7E]/.test(safeSubject)
    ? `=?UTF-8?B?${Buffer.from(safeSubject, "utf-8").toString("base64")}?=`
    : safeSubject;

  const raw = Buffer.from(
    [
      `To: ${safeTo}`,
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
    fromName: string | null;
    receivedDateTime: string;
    subject: string | null;
    bodyPreview: string;
    bodyText: string;
    bodyHtml: string | null;
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

  // Need full payload (not metadata) to decode body parts.
  const { data: thread } = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  const afterMs = afterDate.getTime();

  const messages = thread.messages ?? [];

  return messages
    .map((msg) => {
      const headers = msg.payload?.headers ?? [];
      const headerVal = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
      const fromHeader = headerVal("from");
      const subjectHeader = headerVal("subject");
      const nameMatch = fromHeader.match(/^"?([^"<]+?)"?\s*<[^>]+>$/);
      const fromName = nameMatch ? nameMatch[1].trim() : null;
      // Extract bare email from "Name <email@x>" form
      const fromEmail = (fromHeader.match(/<([^>]+)>/)?.[1] ?? fromHeader)
        .trim()
        .toLowerCase();
      const internalMs = msg.internalDate ? Number(msg.internalDate) : 0;

      const { plain, html } = extractGmailBodies(msg.payload ?? undefined);
      const rawText = plain ?? (html ? htmlToText(html) : "");
      const bodyText = stripQuotedReply(rawText);

      return {
        id: msg.id ?? "",
        fromEmail,
        fromName,
        subject: subjectHeader || null,
        internalMs,
        snippet: msg.snippet ?? "",
        bodyText,
        bodyHtml: html,
      };
    })
    .filter((m) => m.internalMs > afterMs)
    .filter((m) => !userEmail || m.fromEmail !== userEmail)
    .sort((a, b) => b.internalMs - a.internalMs)
    .map((m) => ({
      id: m.id,
      from: m.fromEmail,
      fromName: m.fromName,
      receivedDateTime: new Date(m.internalMs).toISOString(),
      subject: m.subject,
      bodyPreview: m.snippet,
      bodyText: m.bodyText,
      bodyHtml: m.bodyHtml,
    }));
}
