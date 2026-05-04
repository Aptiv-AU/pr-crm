import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type AppRole = "owner" | "admin" | "member";

/**
 * Resolve the caller's role from the persisted user row. Throws if no
 * session or no user row. Today every signed-up user is "owner" by
 * schema default — this helper exists so action gates can start
 * enforcing role boundaries before invitations + role assignment ship.
 */
export async function getCurrentRole(): Promise<AppRole> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const role = (user?.role ?? "owner") as AppRole;
  return role;
}

/**
 * Throws unless the caller's role is in `allowed`. Use at action
 * boundaries that should be gated to org admins (org settings,
 * suppressions, mailbox disconnect, template delete).
 */
export async function requireRole(allowed: AppRole[]): Promise<AppRole> {
  const role = await getCurrentRole();
  if (!allowed.includes(role)) {
    throw new Error("Forbidden — insufficient role");
  }
  return role;
}
