"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { action } from "@/lib/server/action";
import { resolveStyle } from "@/lib/compose/resolve-style";
import { sanitizeSignatureHtml } from "@/lib/compose/sanitize-html";

async function assertAccountOwnedBySessionUser(accountId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const account = await db.emailAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
    select: { id: true },
  });
  if (!account) throw new Error("Email account not found");
}

export const refreshEmailStyle = action(
  "refreshEmailStyle",
  async (accountId: string) => {
    await assertAccountOwnedBySessionUser(accountId);
    // User explicitly asked to refresh — bypass the 7-day TTL gate.
    await resolveStyle(accountId, { force: true });
    return { revalidate: ["/settings/email"] };
  }
);

export const setManualSignature = action(
  "setManualSignature",
  async (accountId: string, html: string, fontFamily: string, fontSize: string) => {
    await assertAccountOwnedBySessionUser(accountId);
    // User paste may contain script tags — sanitise before persisting.
    const sanitized = html ? sanitizeSignatureHtml(html) : "";
    await db.emailAccount.update({
      where: { id: accountId },
      data: {
        signatureHtml: sanitized || null,
        signatureSource: "manual",
        fontFamily: fontFamily || null,
        fontSize: fontSize || null,
        styleResolvedAt: new Date(),
      },
    });
    return { revalidate: ["/settings/email"] };
  }
);
