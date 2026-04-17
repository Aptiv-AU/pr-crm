import { auth } from "@/lib/auth";

/**
 * Returns the authenticated user's organizationId.
 * Throws if the caller is unauthenticated or missing an organizationId.
 * All server actions must funnel org resolution through this helper.
 */
export async function requireOrgId(): Promise<string> {
  const session = await auth();
  const orgId = session?.user?.organizationId;
  if (!orgId) throw new Error("Unauthorized");
  return orgId;
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}
