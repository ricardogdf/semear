import type { AiProviderId } from "./types";

type AiErrorCode =
  | "AUTHENTICATION"
  | "PERMISSION"
  | "RATE_LIMIT"
  | "QUOTA_EXCEEDED"
  | "UNAVAILABLE"
  | "TIMEOUT"
  | "MODEL_NOT_FOUND"
  | "INVALID_REQUEST"
  | "INVALID_RESPONSE"
  | "REFUSAL"
  | "OUTPUT_TRUNCATED"
  | "UNKNOWN";

const providerLabels: Record<AiProviderId, string> = {
  ANTHROPIC: "Anthropic",
  OPENAI: "OpenAI",
  GEMINI: "Google Gemini",
};

const userMessages: Record<AiErrorCode, (provider: string) => string> = {
  AUTHENTICATION: (p) => `A chave de API da ${p} foi recusada. Verifique ou atualize a credencial em Configurações de IA.`,
  PERMISSION: (p) => `A chave da ${p} não tem permissão para este recurso ou modelo.`,
  RATE_LIMIT: (p) => `A ${p} limitou as requisições desta chave. Aguarde alguns instantes e tente novamente.`,
  QUOTA_EXCEEDED: (p) => `A cota ou o saldo da sua conta de API da ${p} se esgotou. Verifique o faturamento da API no painel do provedor.`,
  UNAVAILABLE: (p) => `O serviço da ${p} está indisponível ou sobrecarregado no momento. Tente novamente em alguns minutos.`,
  TIMEOUT: (p) => `A ${p} demorou demais para responder. Tente novamente.`,
  MODEL_NOT_FOUND: (p) => `O modelo selecionado não está disponível na sua conta ${p}. Atualize a lista de modelos em Configurações de IA.`,
  INVALID_REQUEST: (p) => `A ${p} rejeitou a requisição. O modelo escolhido pode não suportar saída estruturada; tente outro modelo.`,
  INVALID_RESPONSE: (p) => `A ${p} retornou uma resposta em formato inválido. Tente novamente ou escolha outro modelo.`,
  REFUSAL: (p) => `O modelo da ${p} se recusou a processar este conteúdo.`,
  OUTPUT_TRUNCATED: (p) => `A resposta da ${p} foi interrompida por limite de tamanho. Tente novamente ou use outro modelo.`,
  UNKNOWN: (p) => `Erro inesperado ao comunicar com a ${p}. Tente novamente.`,
};

/** Códigos que indicam problema na credencial (e não no conteúdo ou no serviço). */
export const credentialErrorCodes: ReadonlySet<AiErrorCode> = new Set(["AUTHENTICATION", "PERMISSION"]);

/**
 * Erro normalizado de provedor. `message` é seguro para o usuário; `detail` é para diagnóstico
 * (já sem segredos) e pode ser persistido.
 */
export class AiProviderError extends Error {
  readonly code: AiErrorCode;
  readonly provider: AiProviderId;
  readonly httpStatus?: number;
  readonly detail?: string;

  constructor(provider: AiProviderId, code: AiErrorCode, options: { httpStatus?: number; detail?: string } = {}) {
    super(userMessages[code](providerLabels[provider]));
    this.name = "AiProviderError";
    this.code = code;
    this.provider = provider;
    this.httpStatus = options.httpStatus;
    this.detail = options.detail;
  }
}

const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{8,}/g,
  /sk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{8,}/g,
  /AIza[0-9A-Za-z_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]{8,}/gi,
];

/** Remove a chave usada e padrões típicos de chaves de qualquer texto de diagnóstico. */
export function redactSecrets(text: string, apiKey?: string) {
  let result = text;
  if (apiKey && apiKey.length >= 6) {
    result = result.split(apiKey).join("[REDACTED]");
  }
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result.slice(0, 500);
}

export function codeFromHttpStatus(status: number | undefined, message = ""): AiErrorCode {
  const lower = message.toLowerCase();
  switch (status) {
    case 401:
      return "AUTHENTICATION";
    case 403:
      return "PERMISSION";
    case 404:
      return "MODEL_NOT_FOUND";
    case 408:
      return "TIMEOUT";
    case 402:
      return "QUOTA_EXCEEDED";
    case 429:
      return /quota|billing|credit|insufficient|exhausted/.test(lower) ? "QUOTA_EXCEEDED" : "RATE_LIMIT";
    case 400:
    case 422:
      if (/api key|api_key|invalid key|unauthorized/.test(lower)) return "AUTHENTICATION";
      if (/credit balance|billing|quota/.test(lower)) return "QUOTA_EXCEEDED";
      if (/model/.test(lower) && /not found|does not exist|not supported|unknown/.test(lower)) {
        return "MODEL_NOT_FOUND";
      }
      return "INVALID_REQUEST";
    default:
      if (status !== undefined && status >= 500) return "UNAVAILABLE";
      return "UNKNOWN";
  }
}
