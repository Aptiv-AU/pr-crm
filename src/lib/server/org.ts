import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Returns the authenticated user's organizationId.
 * Falls back to the single-org findFirst pattern for now since multi-tenant
 * is not yet enforced — but funnels all callers through ONE code path so the
 * flip is a single change.
 */
export async function requireOrgId(): Promise<string> {
  const session = await auth();
  const sessionOrgId = (session?.user as { organizationId?: string } | undefined)
    ?.organizationId;
  if (sessionOrgId) return sessionOrgId;
  // Fallback: single-tenant bootstrap mode. Remove once session carries orgId reliably.
  const org = await db.organization.findFirst({ select: { id: true } });
  if (!org) throw new Error("No organization");
  return org.id;
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}
