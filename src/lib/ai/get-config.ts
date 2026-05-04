import { db } from "@/lib/db";
import type { AIConfig, AIProvider } from "./provider";
import { DEFAULT_MODELS } from "./provider";

const ENV_KEYS: Record<AIProvider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  minimax: "MINIMAX_API_KEY",
};

export async function getAIConfig(organizationId: string): Promise<AIConfig | null> {
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  if (!org) return null;

  // If the organization has an explicit AI provider set, use that
  if (org.aiProvider) {
    const provider = org.aiProvider as AIProvider;
    const envKey = ENV_KEYS[provider];
    const apiKey = envKey ? process.env[envKey] : undefined;

    if (apiKey && apiKey !== "" && !apiKey.startsWith("your-")) {
      return {
        provider,
        apiKey,
        model: org.aiModel ?? DEFAULT_MODELS[provider],
      };
    }
  }

  // Fall back to env var scanning — first available provider wins
  const providers: AIProvider[] = ["anthropic", "openai", "openrouter", "minimax"];

  for (const provider of providers) {
    const apiKey = process.env[ENV_KEYS[provider]];
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
