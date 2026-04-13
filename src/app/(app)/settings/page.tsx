import { db } from "@/lib/db";
import { SettingsClient } from "@/components/settings/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let org = await db.organization.findFirst();
  if (!org) {
    org = await db.organization.create({ data: { name: "NWPR", currency: "AUD" } });
  }

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
