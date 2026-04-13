import { db } from "@/lib/db";
import type { AIConfig, AIProvider } from "./provider";
import { DEFAULT_MODELS } from "./provider";

export async function getAIConfig(): Promise<AIConfig | null> {
  const org = await db.organization.findFirst();
  if (!org) return null;

  // For now, read from env vars. Later this will come from org settings in the DB.
  // Check each provider in order of preference
  const providers: { provider: AIProvider; envKey: string }[] = [
    { provider: "anthropic", envKey: "ANTHROPIC_API_KEY" },
    { provider: "openai", envKey: "OPENAI_API_KEY" },
    { provider: "openrouter", envKey: "OPENROUTER_API_KEY" },
    { provider: "minimax", envKey: "MINIMAX_API_KEY" },
  ];

  for (const { provider, envKey } of providers) {
    const apiKey = process.env[envKey];
    if (apiKey && apiKey !== "" && !apiKey.startsWith("your-")) {
      return {
        provider,
        apiKey,
        model: DEFAULT_MODELS[provider],
      };
    }
  }

  return null;
}
