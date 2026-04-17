"use server";

import { db } from "@/lib/db";
import { action } from "@/lib/server/action";
import { resolveStyle } from "@/lib/compose/resolve-style";

export const refreshEmailStyle = action(
  "refreshEmailStyle",
  async (accountId: string) => {
    await resolveStyle(accountId);
    return { revalidate: ["/settings/email"] };
  }
);

export const setManualSignature = action(
  "setManualSignature",
  async (accountId: string, html: string, fontFamily: string, fontSize: string) => {
    await db.emailAccount.update({
      where: { id: accountId },
      data: {
        signatureHtml: html || null,
        signatureSource: "manual",
        fontFamily: fontFamily || null,
        fontSize: fontSize || null,
        styleResolvedAt: new Date(),
      },
    });
    return { revalidate: ["/settings/email"] };
  }
);
