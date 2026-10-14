import OpenAI from "openai";

import { AiProviderError, codeFromHttpStatus, redactSecrets } from "../errors";
import type { AiModelInfo, AiProviderClient, ProviderClientOptions, StructuredRequest } from "../types";
import { DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_MS, isTimeoutError, parseStructuredText, sortModels } from "./shared";

/**
 * A API de modelos da OpenAI não informa capacidades. Filtramos pelos IDs das famílias de chat
 * que suportam Structured Outputs (json_schema) no Chat Completions e excluímos variantes de
 * áudio, imagem, busca, tempo real e modelos exclusivos da Responses API.
 */
const COMPATIBLE_PREFIX = /^(gpt-4o|gpt-4\.1|gpt-5|o1|o3|o4)/;
const INCOMPATIBLE_PATTERN =
  /(audio|realtime|tts|transcribe|search|image|codex|deep-research|computer-use|-pro(\b|-)|o1-mini|o1-preview|2024-05-13|instruct|embedding|moderation)/;

export function isOpenAiModelCompatible(id: string) {
  return COMPATIBLE_PREFIX.test(id) && !INCOMPATIBLE_PATTERN.test(id);
}

export function createOpenAiClient(options: ProviderClientOptions): AiProviderClient {
  const client = new OpenAI({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  const fail = (error: unknown): never => {
    throw mapOpenAiError(error, options.apiKey);
  };

  return {
    provider: "OPENAI",

    async listModels() {
      const models: AiModelInfo[] = [];
      try {
        for await (const model of client.models.list()) {
          if (isOpenAiModelCompatible(model.id)) {
            models.push({ id: model.id, displayName: model.id });
          }
        }
      } catch (error) {
        fail(error);
      }
      return sortModels(models);
    },

    async generateStructured<T>(model: string, request: StructuredRequest<T>) {
      let completion: OpenAI.Chat.Completions.ChatCompletion;
      try {
        completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "developer", content: request.system },
            { role: "user", content: request.prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: request.schemaName, schema: request.jsonSchema, strict: true },
          },
          max_completion_tokens: request.maxOutputTokens,
        });
      } catch (error) {
        return fail(error);
      }

      const choice = completion.choices[0];
      if (!choice) {
        throw new AiProviderError("OPENAI", "INVALID_RESPONSE", { detail: "Sem choices." });
      }
      if (choice.message.refusal || choice.finish_reason === "content_filter") {
        throw new AiProviderError("OPENAI", "REFUSAL");
      }
      if (choice.finish_reason === "length") {
        throw new AiProviderError("OPENAI", "OUTPUT_TRUNCATED");
      }

      return parseStructuredText("OPENAI", choice.message.content, request.validator);
    },
  };
}

function mapOpenAiError(error: unknown, apiKey?: string): AiProviderError {
  if (error instanceof AiProviderError) return error;

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new AiProviderError("OPENAI", "TIMEOUT");
  }
  if (error instanceof OpenAI.APIConnectionError) {
    return new AiProviderError("OPENAI", "UNAVAILABLE", { detail: "Falha de conexão." });
  }
  if (error instanceof OpenAI.APIError) {
    const message = redactSecrets(error.message ?? "", apiKey);
    const code =
      error.code === "insufficient_quota"
        ? "QUOTA_EXCEEDED"
        : error.code === "model_not_found"
          ? "MODEL_NOT_FOUND"
          : codeFromHttpStatus(error.status, message);
    return new AiProviderError("OPENAI", code, { httpStatus: error.status, detail: message });
  }
  if (isTimeoutError(error)) {
    return new AiProviderError("OPENAI", "TIMEOUT");
  }
  return new AiProviderError("OPENAI", "UNKNOWN", {
    detail: redactSecrets(error instanceof Error ? error.message : String(error), apiKey),
  });
}
