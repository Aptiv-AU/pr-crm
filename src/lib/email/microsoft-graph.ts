import { db } from "@/lib/db";
import { htmlToText, stripQuotedReply } from "./reply-body";

const TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";
const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || "";
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || "";

const SCOPES = "openid email profile offline_access Mail.Send Mail.Read User.Read";

const AUTH_BASE = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0`;
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Build the Microsoft OAuth authorization URL.
 */
export function getAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
    response_mode: "query",
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens, then fetch the user's email.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}> {
  const tokenRes = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: SCOPES,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken: string = tokenData.access_token;
  const refreshToken: string = tokenData.refresh_token;
  const expiresIn: number = tokenData.expires_in; // seconds
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  // Fetch user profile to get email
  const meRes = await fetch(`${GRAPH_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meRes.ok) {
    const err = await meRes.text();
    throw new Error(`Failed to fetch user profile: ${err}`);
  }

  const meData = await meRes.json();
  const email: string = meData.mail || meData.userPrincipalName;

  return { accessToken, refreshToken, expiresAt, email };
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const tokenRes = await fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: SCOPES,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? refreshToken,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
  };
}

/**
 * Get a valid access token for an EmailAccount, refreshing if needed.
 */
export async function getValidToken(emailAccountId: string): Promise<string> {
  const account = await db.emailAccount.findUniqueOrThrow({
    where: { id: emailAccountId },
  });

  // Check if token expires within 5 minutes
  const bufferMs = 5 * 60 * 1000;
  if (account.expiresAt.getTime() - Date.now() > bufferMs) {
    return account.accessToken;
  }

  // Refresh the token
  const refreshed = await refreshAccessToken(account.refreshToken);

  await db.emailAccount.update({
    where: { id: emailAccountId },
    data: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

/**
 * Send an email using the draft-then-send approach to capture the message ID.
 */
export async function sendMail(
  accessToken: string,
  params: { to: string; subject: string; bodyHtml: string }
): Promise<{ messageId: string; conversationId: string }> {
  const { to, subject, bodyHtml } = params;
  // Same defence as Gmail (S-4): refuse multi-recipient strings and
  // strip control characters before any value reaches the wire. Graph's
  // JSON body mostly absorbs CRLF safely, but the OData fallback filter
  // below interpolates the subject into a query string.
  const { stripControlChars, assertSingleRfc5322Address } = await import("./sanitize");
  const safeTo = assertSingleRfc5322Address(to);
  const safeSubject = stripControlChars(subject);

  // 1. Create draft
  const draftRes = await fetch(`${GRAPH_BASE}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: safeSubject,
      body: { contentType: "HTML", content: bodyHtml },
      toRecipients: [{ emailAddress: { address: safeTo } }],
    }),
  });

  if (!draftRes.ok) {
    const err = await draftRes.text();
    throw new Error(`Failed to create draft: ${err}`);
  }

  const draftData = await draftRes.json();
  const messageId: string = draftData.id;

  // 2. Send it
  const sendRes = await fetch(`${GRAPH_BASE}/me/messages/${messageId}/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    throw new Error(`Failed to send message: ${err}`);
  }

  // 3. Get conversationId from the sent message
  // After sending, the message moves to Sent Items. We may need a brief delay
  // or retry since the message ID may change when it moves to Sent Items.
  // Try fetching with the original ID first.
  try {
    const sentRes = await fetch(
      `${GRAPH_BASE}/me/messages/${messageId}?$select=id,conversationId`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (sentRes.ok) {
      const sentData = await sentRes.json();
      return {
        messageId: sentData.id,
        conversationId: sentData.conversationId ?? "",
      };
    }
  } catch {
    // Message may have moved; fall through to search
  }

  // Fallback: search sent items by subject (use sanitised value).
  // M-8: wrap in try/catch — a 401 on this post-send lookup must not
  // bubble up and make the caller treat the *send* as failed (the cron
  // would then release the claim and retry, dual-delivering).
  try {
    const filter = encodeURIComponent(`subject eq '${safeSubject.replace(/'/g, "''")}'`);
    const searchRes = await fetch(
      `${GRAPH_BASE}/me/mailFolders/sentitems/messages?$filter=${filter}&$orderby=sentDateTime desc&$top=1&$select=id,conversationId`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.value && searchData.value.length > 0) {
        return {
          messageId: searchData.value[0].id,
          conversationId: searchData.value[0].conversationId ?? "",
        };
      }
    }
  } catch {
    // Silently fall through — the message was successfully sent; we
    // just couldn't enrich the conversationId.
  }

  // Return what we have even if we couldn't get conversationId
  return { messageId, conversationId: "" };
}

/**
 * Get replies in a conversation after a given date, excluding messages from the user's own email.
 */
export async function getConversationReplies(
  accessToken: string,
  conversationId: string,
  afterDate: Date
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
  // Reject single-quote in conversationId — would break out of the OData
  // single-quoted literal and inject filter clauses.
  if (conversationId.includes("'")) {
    throw new Error("Invalid conversationId");
  }

  const filter = encodeURIComponent(
    `conversationId eq '${conversationId}' and receivedDateTime gt ${afterDate.toISOString()}`
  );
  const res = await fetch(
    `${GRAPH_BASE}/me/messages?$filter=${filter}&$orderby=receivedDateTime desc&$top=10&$select=id,from,receivedDateTime,subject,bodyPreview,body`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch conversation replies: ${err}`);
  }

  const data = await res.json();

  // Get user's own email to filter out outgoing messages
  const meRes = await fetch(`${GRAPH_BASE}/me?$select=mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  let userEmail = "";
  if (meRes.ok) {
    const meData = await meRes.json();
    userEmail = (meData.mail || meData.userPrincipalName || "").toLowerCase();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.value || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((msg: any) => {
      const fromEmail =
        msg.from?.emailAddress?.address?.toLowerCase() ?? "";
      return fromEmail !== userEmail;
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((msg: any) => {
      const contentType: string = (msg.body?.contentType ?? "").toLowerCase();
      const content: string = msg.body?.content ?? "";
      const isHtml = contentType === "html";
      const bodyHtml = isHtml ? content : null;
      const rawText = isHtml ? htmlToText(content) : content;
      const bodyText = stripQuotedReply(rawText);
      return {
        id: msg.id,
        from: msg.from?.emailAddress?.address ?? "",
        fromName: msg.from?.emailAddress?.name ?? null,
        receivedDateTime: msg.receivedDateTime,
        subject: msg.subject ?? null,
        bodyPreview: msg.bodyPreview ?? "",
        bodyText,
        bodyHtml,
      };
    });
}
