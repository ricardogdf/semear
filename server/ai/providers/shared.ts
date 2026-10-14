import type { ZodType } from "zod";

import { AiProviderError } from "../errors";
import type { AiProviderId } from "../types";

export const DEFAULT_TIMEOUT_MS = 120_000;
export const DEFAULT_MAX_RETRIES = 2;

/** Converte o texto do modelo em objeto e valida. Falhas viram INVALID_RESPONSE (nunca resultado válido). */
export function parseStructuredText<T>(provider: AiProviderId, text: string | undefined | null, validator: ZodType<T>): T {
  if (!text?.trim()) {
    throw new AiProviderError(provider, "INVALID_RESPONSE", { detail: "Resposta vazia." });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFence(text));
  } catch {
    throw new AiProviderError(provider, "INVALID_RESPONSE", { detail: "Resposta não é JSON válido." });
  }

  const parsed = validator.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
      .join("; ");
    throw new AiProviderError(provider, "INVALID_RESPONSE", { detail: `Fora do esquema: ${issues}` });
  }

  return parsed.data;
}

function stripCodeFence(text: string) {
  const match = text.match(/^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  return match?.[1] ?? text;
}

export function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    /timed? ?out|timeout/i.test(error.message)
  );
}

export function sortModels<T extends { id: string }>(models: T[]) {
  return [...models].sort((left, right) => left.id.localeCompare(right.id));
}
