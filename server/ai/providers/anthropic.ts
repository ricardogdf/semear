import Anthropic from "@anthropic-ai/sdk";

import { AiProviderError, codeFromHttpStatus, redactSecrets } from "../errors";
import type { AiModelInfo, AiProviderClient, ProviderClientOptions, StructuredRequest } from "../types";
import { DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT_MS, isTimeoutError, parseStructuredText, sortModels } from "./shared";

/**
 * Anthropic (Claude) via SDK oficial. Saída estruturada com `output_config.format` (JSON Schema),
 * que funciona inclusive nos modelos que não aceitam tool_choice forçado.
 */
export function createAnthropicClient(options: ProviderClientOptions): AiProviderClient {
  const client = new Anthropic({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  const fail = (error: unknown): never => {
    throw mapAnthropicError(error, options.apiKey);
  };

  return {
    provider: "ANTHROPIC",

    async listModels() {
      const models: AiModelInfo[] = [];
      try {
        for await (const model of client.models.list({ limit: 100 })) {
          // Sem capacidades informadas, mantém o modelo; com elas, exige saída estruturada.
          const structured = model.capabilities?.structured_outputs?.supported;
          if (structured === false) continue;
          models.push({ id: model.id, displayName: model.display_name || model.id });
        }
      } catch (error) {
        fail(error);
      }
      return sortModels(models);
    },

    async generateStructured<T>(model: string, request: StructuredRequest<T>) {
      let response: Anthropic.Message;
      try {
        response = await client.messages.create({
          model,
          max_tokens: request.maxOutputTokens,
          system: request.system,
          messages: [{ role: "user", content: request.prompt }],
          output_config: { format: { type: "json_schema", schema: request.jsonSchema } },
        });
      } catch (error) {
        return fail(error);
      }

      if (response.stop_reason === "refusal") {
        throw new AiProviderError("ANTHROPIC", "REFUSAL");
      }
      if (response.stop_reason === "max_tokens") {
        throw new AiProviderError("ANTHROPIC", "OUTPUT_TRUNCATED");
      }

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      return parseStructuredText("ANTHROPIC", text, request.validator);
    },
  };
}

function mapAnthropicError(error: unknown, apiKey?: string): AiProviderError {
  if (error instanceof AiProviderError) return error;

  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AiProviderError("ANTHROPIC", "TIMEOUT");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AiProviderError("ANTHROPIC", "UNAVAILABLE", { detail: "Falha de conexão." });
  }
  if (error instanceof Anthropic.APIError) {
    const message = redactSecrets(error.message ?? "", apiKey);
    const code = codeFromHttpStatus(error.status, message);
    return new AiProviderError("ANTHROPIC", code, { httpStatus: error.status, detail: message });
  }
  if (isTimeoutError(error)) {
    return new AiProviderError("ANTHROPIC", "TIMEOUT");
  }
  return new AiProviderError("ANTHROPIC", "UNKNOWN", {
    detail: redactSecrets(error instanceof Error ? error.message : String(error), apiKey),
  });
}
