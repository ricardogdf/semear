import type { ZodType } from "zod";

export const aiProviderIds = ["ANTHROPIC", "OPENAI", "GEMINI"] as const;
export type AiProviderId = (typeof aiProviderIds)[number];

export interface AiModelInfo {
  id: string;
  displayName: string;
}

export type JsonSchema = Record<string, unknown>;

export interface StructuredRequest<T> {
  /** Instruções do sistema (papel, regras, formato). */
  system: string;
  /** Conteúdo do usuário (inclui o material da aula, delimitado). */
  prompt: string;
  /** Nome curto do formato (exigido por alguns provedores). */
  schemaName: string;
  /** JSON Schema enviado ao provedor (todas as propriedades obrigatórias, additionalProperties: false). */
  jsonSchema: JsonSchema;
  /** Validação local da resposta. A resposta do provedor nunca é aceita sem passar por aqui. */
  validator: ZodType<T>;
  maxOutputTokens: number;
}

/** Interface comum que cada provedor implementa. */
export interface AiProviderClient {
  readonly provider: AiProviderId;
  /** Lista os modelos compatíveis com geração de texto e saída estruturada. */
  listModels(): Promise<AiModelInfo[]>;
  /** Gera uma resposta estruturada (JSON) validada contra `validator`. */
  generateStructured<T>(model: string, request: StructuredRequest<T>): Promise<T>;
}

export interface ProviderClientOptions {
  apiKey: string;
  /** Tempo máximo por requisição (ms). */
  timeoutMs?: number;
  /** Tentativas automáticas em erros transitórios (429/5xx/rede). */
  maxRetries?: number;
  /** Substitui o fetch global (usado nos testes). */
  fetch?: typeof fetch;
}
