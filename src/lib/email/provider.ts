import type { EmailAccount } from "@prisma/client";
import { gmailProvider } from "./gmail-provider";
import { microsoftProvider } from "./microsoft-provider";

export type OutgoingMessage = {
  to: string;
  subject: string;
  bodyHtml: string;
};

export type SendResult = {
  messageId: string;
  threadId: string;
};

/**
 * Provider-neutral reply shape. Matches what the underlying Gmail/Graph
 * adapters already return so `checkForReplies` can stay identical.
 */
export type Reply = {
  id: string;
  from: string;
  fromName: string | null;
  receivedDateTime: string;
  subject: string | null;
  bodyPreview: string;
  /** Cleaned plaintext (HTML-stripped + quoted-reply removed). Always populated. */
  bodyText: string;
  /** Raw HTML when the source message had an HTML part. Stored for future rich
   * rendering — never inserted into the DOM as-is. */
  bodyHtml: string | null;
};

export type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
};

export interface EmailProvider {
  name: "gmail" | "microsoft_graph";
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenBundle>;
  getValidToken(accountId: string): Promise<string>;
  send(token: string, msg: OutgoingMessage): Promise<SendResult>;
  getReplies(token: string, threadId: string, after: Date): Promise<Reply[]>;
}

export function providerFor(
  account: Pick<EmailAccount, "provider">
): EmailProvider {
  return account.provider === "google" ? gmailProvider : microsoftProvider;
}
