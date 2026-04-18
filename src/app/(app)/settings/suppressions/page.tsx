import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listSuppressions } from "@/actions/suppression-actions";
import { SuppressionManager } from "@/components/settings/suppression-manager";

export const dynamic = "force-dynamic";

export default async function SuppressionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const suppressions = await listSuppressions();

  return (
    <div style={{ padding: 32, maxWidth: 880, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Suppression list
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted-custom)" }}>
          Pressroom will refuse to send outreach to any address on this list. Entries are
          added manually or from the reply view when a journalist asks to be removed.
        </p>
      </div>

      <SuppressionManager
        suppressions={suppressions.map((s) => ({
          id: s.id,
          email: s.email,
          reason: s.reason,
          note: s.note,
          createdByUserId: s.createdByUserId,
          createdAt: s.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
