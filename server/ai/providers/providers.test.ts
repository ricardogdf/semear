import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AiProviderError, redactSecrets } from "../errors";
import type { StructuredRequest } from "../types";
import { createAnthropicClient } from "./anthropic";
import { createGeminiClient, isGeminiModelCompatible } from "./gemini";
import { createOpenAiClient, isOpenAiModelCompatible } from "./openai";

const KEY = "sk-test-SUPERSECRET-0123456789";

const request: StructuredRequest<{ ok: boolean }> = {
  system: "s",
  prompt: "p",
  schemaName: "test_schema",
  jsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false },
  validator: z.object({ ok: z.boolean() }),
  maxOutputTokens: 100,
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** fetch falso que responde em sequência e registra as chamadas. */
function scriptedFetch(...responses: Array<Response | Error>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url instanceof Request ? url.url : url), init });
    const next = responses.shift();
    if (!next) throw new Error("sem resposta configurada");
    if (next instanceof Error) throw next;
    return next;
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

const anthropicMessage = (text: string, stop_reason = "end_turn") => ({
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: "claude-x",
  content: [{ type: "text", text }],
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 },
});

describe("Anthropic", () => {
  it("lista apenas modelos com saída estruturada", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(200, {
        data: [
          { id: "claude-a", display_name: "Claude A", type: "model", created_at: "2026-01-01T00:00:00Z", capabilities: { structured_outputs: { supported: true } } },
          { id: "claude-old", display_name: "Old", type: "model", created_at: "2024-01-01T00:00:00Z", capabilities: { structured_outputs: { supported: false } } },
        ],
        has_more: false,
        first_id: "claude-a",
        last_id: "claude-old",
      }),
    );
    const client = createAnthropicClient({ apiKey: KEY, fetch, maxRetries: 0 });
    expect(await client.listModels()).toEqual([{ id: "claude-a", displayName: "Claude A" }]);
  });

  it("envia o JSON Schema em output_config.format e valida a resposta", async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse(200, anthropicMessage('{"ok":true}')));
    const client = createAnthropicClient({ apiKey: KEY, fetch, maxRetries: 0 });

    expect(await client.generateStructured("claude-a", request)).toEqual({ ok: true });
    const body = JSON.parse(String(calls[0]!.init!.body));
    expect(body.output_config.format).toEqual({ type: "json_schema", schema: request.jsonSchema });
    expect(body.max_tokens).toBe(100);
  });

  it("mapeia 401 para AUTHENTICATION sem expor a chave", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(401, { type: "error", error: { type: "authentication_error", message: `invalid x-api-key ${KEY}` } }),
    );
    const client = createAnthropicClient({ apiKey: KEY, fetch, maxRetries: 0 });
    const error = await client.listModels().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AiProviderError);
    expect(error).toMatchObject({ code: "AUTHENTICATION", httpStatus: 401 });
    expect(JSON.stringify({ ...(error as AiProviderError), message: (error as Error).message })).not.toContain("SUPERSECRET");
  });

  it("mapeia 429 para RATE_LIMIT e 529 (sobrecarga) para UNAVAILABLE", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(429, { type: "error", error: { type: "rate_limit_error", message: "slow down" } }),
      jsonResponse(529, { type: "error", error: { type: "overloaded_error", message: "Overloaded" } }),
    );
    const client = createAnthropicClient({ apiKey: KEY, fetch, maxRetries: 0 });
    await expect(client.generateStructured("m", request)).rejects.toMatchObject({ code: "RATE_LIMIT" });
    await expect(client.generateStructured("m", request)).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("trata recusa, truncamento e JSON inválido como erros (nunca como sucesso)", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(200, anthropicMessage("", "refusal")),
      jsonResponse(200, anthropicMessage('{"ok":', "max_tokens")),
      jsonResponse(200, anthropicMessage("não é json")),
      jsonResponse(200, anthropicMessage('{"ok":"sim"}')),
    );
    const client = createAnthropicClient({ apiKey: KEY, fetch, maxRetries: 0 });
    await expect(client.generateStructured("m", request)).rejects.toMatchObject({ code: "REFUSAL" });
    await expect(client.generateStructured("m", request)).rejects.toMatchObject({ code: "OUTPUT_TRUNCATED" });
    await expect(client.generateStructured("m", request)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(client.generateStructured("m", request)).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("falha de rede vira UNAVAILABLE", async () => {
    const { fetch } = scriptedFetch(new TypeError("fetch failed"));
    const client = createAnthropicClient({ apiKey: KEY, fetch, maxRetries: 0 });
    await expect(client.generateStructured("m", request)).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });
});

describe("OpenAI", () => {
  const completion = (content: string | null, finish_reason = "stop", refusal: string | null = null) => ({
    id: "c1",
    object: "chat.completion",
    created: 1,
    model: "gpt-x",
    choices: [{ index: 0, message: { role: "assistant", content, refusal }, finish_reason, logprobs: null }],
  });

  it("filtra a lista de modelos para os compatíveis com Structured Outputs", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(200, {
        object: "list",
        data: ["gpt-5", "gpt-4.1-mini", "gpt-4o-mini-tts", "text-embedding-3-small", "o3-pro", "gpt-3.5-turbo", "o4-mini"].map(
          (id) => ({ id, object: "model", created: 1, owned_by: "openai" }),
        ),
      }),
    );
    const client = createOpenAiClient({ apiKey: KEY, fetch, maxRetries: 0 });
    expect((await client.listModels()).map((model) => model.id)).toEqual(["gpt-4.1-mini", "gpt-5", "o4-mini"]);
    expect(isOpenAiModelCompatible("gpt-4o-realtime-preview")).toBe(false);
  });

  it("usa response_format json_schema estrito", async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse(200, completion('{"ok":false}')));
    const client = createOpenAiClient({ apiKey: KEY, fetch, maxRetries: 0 });
    expect(await client.generateStructured("gpt-5", request)).toEqual({ ok: false });

    const body = JSON.parse(String(calls[0]!.init!.body));
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "test_schema", schema: request.jsonSchema, strict: true },
    });
    expect(body.max_completion_tokens).toBe(100);
  });

  it("diferencia cota esgotada de limite de requisições", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(429, { error: { message: "You exceeded your current quota", type: "insufficient_quota", code: "insufficient_quota" } }),
      jsonResponse(429, { error: { message: "Rate limit reached", type: "requests", code: "rate_limit_exceeded" } }),
    );
    const client = createOpenAiClient({ apiKey: KEY, fetch, maxRetries: 0 });
    await expect(client.generateStructured("gpt-5", request)).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
    await expect(client.generateStructured("gpt-5", request)).rejects.toMatchObject({ code: "RATE_LIMIT" });
  });

  it("chave inválida e recusa", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(401, { error: { message: `Incorrect API key provided: ${KEY}`, type: "invalid_request_error", code: "invalid_api_key" } }),
      jsonResponse(200, completion(null, "stop", "Não posso ajudar.")),
    );
    const client = createOpenAiClient({ apiKey: KEY, fetch, maxRetries: 0 });
    const error = await client.generateStructured("gpt-5", request).catch((caught: AiProviderError) => caught);
    expect(error).toMatchObject({ code: "AUTHENTICATION" });
    expect((error as AiProviderError).detail).not.toContain("SUPERSECRET");
    await expect(client.generateStructured("gpt-5", request)).rejects.toMatchObject({ code: "REFUSAL" });
  });
});

describe("Google Gemini", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("filtra modelos e remove o prefixo models/", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(200, {
        models: [
          { name: "models/gemini-2.5-flash", displayName: "Gemini 2.5 Flash", supportedGenerationMethods: ["generateContent", "countTokens"] },
          { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
          { name: "models/gemini-2.5-flash-preview-tts", supportedGenerationMethods: ["generateContent"] },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const client = createGeminiClient({ apiKey: KEY });
    expect(await client.listModels()).toEqual([{ id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" }]);
    expect(isGeminiModelCompatible("models/gemini-embedding-001", ["embedContent"])).toBe(false);
  });

  it("gera JSON com responseJsonSchema e valida", async () => {
    const { fetch, calls } = scriptedFetch(
      jsonResponse(200, {
        candidates: [{ content: { role: "model", parts: [{ text: '{"ok":true}' }] }, finishReason: "STOP" }],
      }),
    );
    vi.stubGlobal("fetch", fetch);

    const client = createGeminiClient({ apiKey: KEY });
    expect(await client.generateStructured("gemini-2.5-flash", request)).toEqual({ ok: true });
    const body = JSON.parse(String(calls[0]!.init!.body));
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema).toEqual(request.jsonSchema);
  });

  it("chave inválida (400 INVALID_ARGUMENT) vira AUTHENTICATION; 503 vira UNAVAILABLE", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(400, { error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" } }),
      jsonResponse(503, { error: { code: 503, message: "The model is overloaded.", status: "UNAVAILABLE" } }),
    );
    vi.stubGlobal("fetch", fetch);

    const client = createGeminiClient({ apiKey: KEY });
    await expect(client.generateStructured("gemini-2.5-flash", request)).rejects.toMatchObject({ code: "AUTHENTICATION" });
    await expect(client.generateStructured("gemini-2.5-flash", request)).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("bloqueio de segurança e truncamento são erros", async () => {
    const { fetch } = scriptedFetch(
      jsonResponse(200, { candidates: [{ content: { role: "model", parts: [] }, finishReason: "SAFETY" }] }),
      jsonResponse(200, { candidates: [{ content: { role: "model", parts: [{ text: '{"ok":' }] }, finishReason: "MAX_TOKENS" }] }),
    );
    vi.stubGlobal("fetch", fetch);

    const client = createGeminiClient({ apiKey: KEY });
    await expect(client.generateStructured("g", request)).rejects.toMatchObject({ code: "REFUSAL" });
    await expect(client.generateStructured("g", request)).rejects.toMatchObject({ code: "OUTPUT_TRUNCATED" });
  });
});

describe("redactSecrets", () => {
  it("remove a chave usada e padrões conhecidos", () => {
    const text = `erro com ${KEY} e AIzaSyD-abcdefghijklmnopqrstuvwxyz e sk-ant-api03-abcdefghijk`;
    const redacted = redactSecrets(text, KEY);
    expect(redacted).not.toContain("SUPERSECRET");
    expect(redacted).not.toContain("AIzaSyD");
    expect(redacted).not.toContain("sk-ant-api03");
  });
});
