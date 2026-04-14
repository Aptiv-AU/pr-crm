import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/settings-client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

  // Get all users in the org for user management
  const users = await db.user.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const currentUser = users.find(u => u.id === session.user?.id);

  const apiKeyStatus = {
    anthropic: !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "" && !process.env.ANTHROPIC_API_KEY.startsWith("your-")),
    openai: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "" && !process.env.OPENAI_API_KEY.startsWith("your-")),
    openrouter: !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "" && !process.env.OPENROUTER_API_KEY.startsWith("your-")),
    minimax: !!(process.env.MINIMAX_API_KEY && process.env.MINIMAX_API_KEY !== "" && !process.env.MINIMAX_API_KEY.startsWith("your-")),
  };

  const emailAccount = await db.emailAccount.findFirst({
    select: { id: true, email: true, provider: true, createdAt: true },
  });

  return (
    <SettingsClient
      org={{
        name: org.name,
        currency: org.currency,
        aiProvider: org.aiProvider,
        aiModel: org.aiModel,
      }}
      currentUser={currentUser ? { id: currentUser.id, name: currentUser.name, email: currentUser.email } : null}
      users={users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt.toISOString() }))}
      apiKeyStatus={apiKeyStatus}
      emailAccount={
        emailAccount
          ? {
              id: emailAccount.id,
              email: emailAccount.email,
              provider: emailAccount.provider,
              createdAt: emailAccount.createdAt.toISOString(),
            }
          : null
      }
    />
  );
}
