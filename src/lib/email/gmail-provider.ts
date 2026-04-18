import {
  getGoogleAuthUrl,
  exchangeGoogleCode,
  getValidGoogleToken,
  sendGmail,
  getGmailThreadReplies,
} from "./gmail";
import type { EmailProvider } from "./provider";

export const gmailProvider: EmailProvider = {
  name: "gmail",
  getAuthUrl: getGoogleAuthUrl,
  exchangeCode: exchangeGoogleCode,
  getValidToken: getValidGoogleToken,
  send: async (token, msg) => {
    const { messageId, threadId } = await sendGmail(token, msg);
    return { messageId, threadId };
  },
  getReplies: (token, threadId, after) =>
    getGmailThreadReplies(token, threadId, after),
};
