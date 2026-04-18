import {
  getAuthUrl,
  exchangeCodeForTokens,
  getValidToken,
  sendMail,
  getConversationReplies,
} from "./microsoft-graph";
import type { EmailProvider } from "./provider";

export const microsoftProvider: EmailProvider = {
  name: "microsoft_graph",
  getAuthUrl,
  exchangeCode: exchangeCodeForTokens,
  getValidToken,
  send: async (token, msg) => {
    const { messageId, conversationId } = await sendMail(token, msg);
    return { messageId, threadId: conversationId };
  },
  getReplies: (token, threadId, after) =>
    getConversationReplies(token, threadId, after),
};
