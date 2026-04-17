"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { resolveStyle } from "@/lib/compose/resolve-style";

export async function refreshEmailStyle(accountId: string) {
  try {
    await resolveStyle(accountId);
    revalidatePath("/settings/email");
    return { success: true };
  } catch (error) {
    console.error("refreshEmailStyle error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to refresh style",
    };
  }
}

export async function setManualSignature(
  accountId: string,
  html: string,
  fontFamily: string,
  fontSize: string,
) {
  try {
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
    revalidatePath("/settings/email");
    return { success: true };
  } catch (error) {
    console.error("setManualSignature error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to save signature",
    };
  }
}
