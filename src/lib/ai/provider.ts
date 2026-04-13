import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AIProvider = "anthropic" | "openai" | "openrouter" | "minimax";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

// Default models per provider
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  openrouter: "anthropic/claude-sonnet-4",
  minimax: "MiniMax-M2.5",
};

// Provider display info
export const PROVIDER_INFO: Record<AIProvider, { name: string; baseUrl?: string; sdk: "anthropic" | "openai" }> = {
  anthropic: { name: "Claude (Anthropic)", sdk: "anthropic" },
  openai: { name: "OpenAI GPT", sdk: "openai" },
  openrouter: { name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", sdk: "openai" },
  minimax: { name: "MiniMax", baseUrl: "https://api.minimax.io/anthropic", sdk: "anthropic" },
};

export async function generateText(config: AIConfig, options: GenerateOptions): Promise<string> {
  const { provider, apiKey, model } = config;
  const { systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1024 } = options;
  const info = PROVIDER_INFO[provider];

  if (info.sdk === "anthropic") {
    // Anthropic SDK — used for both Anthropic direct and MiniMax (Anthropic-compatible)
    const client = new Anthropic({
      apiKey,
      ...(info.baseUrl ? { baseURL: info.baseUrl } : {}),
    });
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature,
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? "";
  }

  // OpenAI-compatible providers (openai, openrouter)
  const client = new OpenAI({
    apiKey,
    ...(info.baseUrl ? { baseURL: info.baseUrl } : {}),
  });

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content ?? "";
}

// Streaming version for pitch generation
export async function* generateTextStream(config: AIConfig, options: GenerateOptions): AsyncGenerator<string> {
  const { provider, apiKey, model } = config;
  const { systemPrompt, userPrompt, temperature = 0.7, maxTokens = 1024 } = options;
  const info = PROVIDER_INFO[provider];

  if (info.sdk === "anthropic") {
    // Anthropic SDK streaming — used for Anthropic and MiniMax
    const client = new Anthropic({
      apiKey,
      ...(info.baseUrl ? { baseURL: info.baseUrl } : {}),
    });
    const stream = await client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    return;
  }

  // OpenAI-compatible streaming (openai, openrouter)
  const client = new OpenAI({
    apiKey,
    ...(info.baseUrl ? { baseURL: info.baseUrl } : {}),
  });

  const stream = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
