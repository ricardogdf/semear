import type { AiProviderClient, AiProviderId, ProviderClientOptions } from "../types";
import { createAnthropicClient } from "./anthropic";
import { createGeminiClient } from "./gemini";
import { createOpenAiClient } from "./openai";

interface AiProviderMetadata {
  id: AiProviderId;
  label: string;
  product: string;
  apiKeyUrl: string;
  apiKeyInstructions: string;
}

/**
 * As integrações usam a API de cada provedor (cobrança por uso na conta de API do usuário).
 * Assinaturas dos produtos de chat (Claude Pro, ChatGPT Plus, Gemini Advanced…) não incluem,
 * necessariamente, créditos ou acesso à API.
 */
export const aiProviders: Record<AiProviderId, AiProviderMetadata> = {
  ANTHROPIC: {
    id: "ANTHROPIC",
    label: "Anthropic Claude",
    product: "Claude API",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyInstructions: "Crie uma chave em Claude Console → API Keys. Requer créditos de API na conta da Anthropic.",
  },
  OPENAI: {
    id: "OPENAI",
    label: "OpenAI ChatGPT",
    product: "OpenAI API",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyInstructions: "Crie uma chave em OpenAI Platform → API keys. A assinatura do ChatGPT não inclui créditos da API.",
  },
  GEMINI: {
    id: "GEMINI",
    label: "Google Gemini",
    product: "Gemini API",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyInstructions: "Crie uma chave no Google AI Studio → Get API key. Limites e cobrança seguem o plano da Gemini API.",
  },
};

export function createProviderClient(provider: AiProviderId, options: ProviderClientOptions): AiProviderClient {
  switch (provider) {
    case "ANTHROPIC":
      return createAnthropicClient(options);
    case "OPENAI":
      return createOpenAiClient(options);
    case "GEMINI":
      return createGeminiClient(options);
  }
}
