import { ApiError, GoogleGenAI, type GenerateContentResponse } from "@google/genai";

import { AiProviderError, codeFromHttpStatus, redactSecrets } from "../errors";
import type { AiModelInfo, AiProviderClient, ProviderClientOptions, StructuredRequest } from "../types";
import { DEFAULT_TIMEOUT_MS, isTimeoutError, parseStructuredText, sortModels } from "./shared";

/** Modelos Gemini sem geração de texto estruturado (embeddings, imagem, áudio, tempo real…). */
const INCOMPATIBLE_PATTERN =
  /(embedding|aqa|imagen|image|tts|audio|live|veo|lyria|robotics|computer-use|learnlm)/;

export function isGeminiModelCompatible(name: string, supportedActions: string[] | undefined) {
  return (
    /gemini/.test(name) &&
    !INCOMPATIBLE_PATTERN.test(name) &&
    (supportedActions ?? []).includes("generateContent")
  );
}

/** Google Gemini (Gemini API / Google AI Studio) via SDK oficial @google/genai. */
export function createGeminiClient(options: ProviderClientOptions): AiProviderClient {
  const client = new GoogleGenAI({
    apiKey: options.apiKey,
    httpOptions: { timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS },
  });

  const fail = (error: unknown): never => {
    throw mapGeminiError(error, options.apiKey);
  };

  return {
    provider: "GEMINI",

    async listModels() {
      const models: AiModelInfo[] = [];
      try {
        const pager = await client.models.list({ config: { pageSize: 100 } });
        for await (const model of pager) {
          const name = model.name ?? "";
          if (!isGeminiModelCompatible(name, model.supportedActions)) continue;
          const id = name.replace(/^models\//, "");
          models.push({ id, displayName: model.displayName || id });
        }
      } catch (error) {
        fail(error);
      }
      return sortModels(models);
    },

    async generateStructured<T>(model: string, request: StructuredRequest<T>) {
      let response: GenerateContentResponse;
      try {
        response = await client.models.generateContent({
          model,
          contents: request.prompt,
          config: {
            systemInstruction: request.system,
            responseMimeType: "application/json",
            responseJsonSchema: request.jsonSchema,
            maxOutputTokens: request.maxOutputTokens,
          },
        });
      } catch (error) {
        return fail(error);
      }

      if (response.promptFeedback?.blockReason) {
        throw new AiProviderError("GEMINI", "REFUSAL", { detail: String(response.promptFeedback.blockReason) });
      }

      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        throw new AiProviderError("GEMINI", "OUTPUT_TRUNCATED");
      }
      if (finishReason && ["SAFETY", "RECITATION", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"].includes(finishReason)) {
        throw new AiProviderError("GEMINI", "REFUSAL", { detail: finishReason });
      }

      return parseStructuredText("GEMINI", response.text, request.validator);
    },
  };
}

function mapGeminiError(error: unknown, apiKey?: string): AiProviderError {
  if (error instanceof AiProviderError) return error;

  if (error instanceof ApiError) {
    const message = redactSecrets(error.message ?? "", apiKey);
    const code = /RESOURCE_EXHAUSTED/.test(message) && /quota/i.test(message)
      ? "QUOTA_EXCEEDED"
      : codeFromHttpStatus(error.status, message);
    return new AiProviderError("GEMINI", code, { httpStatus: error.status, detail: message });
  }
  if (isTimeoutError(error)) {
    return new AiProviderError("GEMINI", "TIMEOUT");
  }
  if (error instanceof TypeError) {
    // fetch lança TypeError em falhas de rede/DNS.
    return new AiProviderError("GEMINI", "UNAVAILABLE", { detail: "Falha de conexão." });
  }
  return new AiProviderError("GEMINI", "UNKNOWN", {
    detail: redactSecrets(error instanceof Error ? error.message : String(error), apiKey),
  });
}
