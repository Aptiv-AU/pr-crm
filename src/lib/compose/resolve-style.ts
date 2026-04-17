import { google } from "googleapis";
import { db } from "@/lib/db";
import { getValidGoogleToken } from "@/lib/email/gmail";
import { getValidToken as getValidMicrosoftToken } from "@/lib/email/microsoft-graph";
import { extractSignature, extractFontStyle } from "./extract-signature";

const GMAIL_DEFAULT_FONT = "Arial, Helvetica, sans-serif";
const GMAIL_DEFAULT_SIZE = "13px";
const OUTLOOK_DEFAULT_FONT = "Aptos, Calibri, sans-serif";
const OUTLOOK_DEFAULT_SIZE = "11pt";

export async function resolveStyle(emailAccountId: string) {
  const acct = await db.emailAccount.findUnique({ where: { id: emailAccountId } });
  if (!acct) throw new Error("EmailAccount not found");

  if (acct.provider === "google") {
    return await resolveGoogle(acct);
  }
  return await resolveMicrosoft(acct);
}

async function resolveGoogle(acct: { id: string; email: string }) {
  const token = await getValidGoogleToken(acct.id);
  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({ access_token: token });
  const gmail = google.gmail({ version: "v1", auth: authClient });

  // Signature via sendAs
  let signatureHtml: string | null = null;
  let sigFromApi = false;
  try {
    const { data } = await gmail.users.settings.sendAs.list({ userId: "me" });
    const chosen =
      data.sendAs?.find((s) => s.isDefault) ?? data.sendAs?.find((s) => s.isPrimary);
    if (chosen?.signature) {
      signatureHtml = chosen.signature;
      sigFromApi = true;
    }
  } catch (e) {
    console.warn("sendAs.list failed, will fall back to sent-items scrape", e);
  }

  // Font: no API — scrape sent items
  let fontFamily: string | null = null;
  let fontSize: string | null = null;
  try {
    const { data: sentList } = await gmail.users.messages.list({
      userId: "me",
      q: "in:sent -in:chats newer_than:90d",
      maxResults: 10,
    });
    const msgs = await Promise.all(
      (sentList.messages ?? [])
        .slice(0, 10)
        .map((m) =>
          gmail.users.messages.get({ userId: "me", id: m.id!, format: "full" }),
        ),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const htmls = msgs.map((r) => extractHtmlPart(r.data)).filter(Boolean) as string[];
    if (!signatureHtml && htmls.length >= 2) {
      signatureHtml = extractSignature(htmls, acct.email.split("@")[0]);
    }
    const styles = htmls.map(extractFontStyle).filter((s) => s.fontFamily);
    if (styles[0]) {
      fontFamily = styles[0].fontFamily;
      fontSize = styles[0].fontSize;
    }
  } catch (e) {
    console.warn("sent-items scrape failed", e);
  }

  const source: "api" | "scraped" | "default" = signatureHtml
    ? sigFromApi
      ? "api"
      : "scraped"
    : "default";

  await db.emailAccount.update({
    where: { id: acct.id },
    data: {
      signatureHtml,
      signatureSource: source,
      fontFamily: fontFamily ?? GMAIL_DEFAULT_FONT,
      fontSize: fontSize ?? GMAIL_DEFAULT_SIZE,
      styleResolvedAt: new Date(),
    },
  });
}

async function resolveMicrosoft(acct: { id: string; email: string }) {
  const token = await getValidMicrosoftToken(acct.id);
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/mailFolders/SentItems/messages?$top=10&$select=body,subject,sentDateTime",
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const htmls: string[] = (data.value ?? []).map((m: any) => m.body?.content).filter(Boolean);

  const firstName = acct.email.split("@")[0];
  const signatureHtml = htmls.length >= 2 ? extractSignature(htmls, firstName) : null;
  const style =
    htmls.map(extractFontStyle).find((s) => s.fontFamily) ?? {
      fontFamily: null,
      fontSize: null,
    };

  await db.emailAccount.update({
    where: { id: acct.id },
    data: {
      signatureHtml,
      signatureSource: signatureHtml ? "scraped" : "default",
      fontFamily: style.fontFamily ?? OUTLOOK_DEFAULT_FONT,
      fontSize: style.fontSize ?? OUTLOOK_DEFAULT_SIZE,
      styleResolvedAt: new Date(),
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractHtmlPart(message: any): string | null {
  const parts = [message.payload, ...(message.payload?.parts ?? [])];
  for (const p of parts) {
    if (p?.mimeType === "text/html" && p.body?.data) {
      return Buffer.from(p.body.data, "base64url").toString("utf-8");
    }
  }
  return null;
}
