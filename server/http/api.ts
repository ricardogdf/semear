import { NextResponse } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";

import { AiProviderError } from "@/server/ai";
import { DomainError, getSessionUser, type SessionUser } from "@/server/db";

import { getSessionTokenFromRequest } from "./session";

type RouteAuth = "public" | "user" | "admin";

interface HandlerContext<P> {
  request: Request;
  params: P;
  user: SessionUser;
}

interface PublicHandlerContext<P> {
  request: Request;
  params: P;
  user: SessionUser | null;
}

type RouteContext<P> = { params: Promise<P> };
type NoParams = Record<never, never>;

/** Rotas sem parâmetros recebem só a requisição; rotas dinâmicas recebem também o contexto do Next. */
type RouteHandler<P> = [keyof P] extends [never]
  ? (request: Request) => Promise<Response>
  : (request: Request, context: RouteContext<P>) => Promise<Response>;

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Defesa CSRF complementar ao SameSite=Lax: rejeita requisições que alteram estado vindas
 * de outra origem (navegadores enviam Origin e Sec-Fetch-Site nessas requisições).
 */
function isTrustedOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** IP do cliente informado pelo proxy reverso (o proxy deve sobrescrever X-Forwarded-For). */
export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim().slice(0, 64) || null;
  }
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}

function jsonError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ message, ...extra }, { status });
}

const aiErrorStatus: Record<string, number> = {
  AUTHENTICATION: 422,
  PERMISSION: 422,
  MODEL_NOT_FOUND: 422,
  INVALID_REQUEST: 422,
  REFUSAL: 422,
  OUTPUT_TRUNCATED: 502,
  INVALID_RESPONSE: 502,
  RATE_LIMIT: 429,
  QUOTA_EXCEEDED: 429,
  UNAVAILABLE: 503,
  TIMEOUT: 504,
  UNKNOWN: 502,
};

function toErrorResponse(error: unknown) {
  if (error instanceof DomainError) {
    return jsonError(error.status, error.message, { code: error.code });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return jsonError(400, first?.message ?? "Dados inválidos.", {
      code: "VALIDATION",
      fieldErrors: error.flatten().fieldErrors,
    });
  }
  if (error instanceof AiProviderError) {
    return jsonError(aiErrorStatus[error.code] ?? 502, error.message, { code: `AI_${error.code}` });
  }

  // Erro inesperado: registra apenas tipo e mensagem resumida (sem corpo da requisição).
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message.slice(0, 300) : "";
  console.error(`[api] erro inesperado: ${name}: ${message}`);
  return jsonError(500, "Erro interno. Tente novamente.");
}

export async function readJson<T>(request: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError("VALIDATION", "Corpo da requisição inválido.");
  }
  return schema.parse(body);
}

async function resolveUser(request: Request) {
  return getSessionUser(getSessionTokenFromRequest(request));
}

async function guard(request: Request) {
  if (UNSAFE_METHODS.has(request.method) && !isTrustedOrigin(request)) {
    throw new DomainError("FORBIDDEN", "Origem da requisição não permitida.");
  }
}

/** Rota que exige sessão válida (e, opcionalmente, papel de administrador). */
export function authRoute<P extends Record<string, string> = NoParams>(
  auth: Exclude<RouteAuth, "public">,
  handler: (context: HandlerContext<P>) => Promise<Response>,
): RouteHandler<P> {
  return (async (request: Request, context?: RouteContext<P>) => {
    try {
      await guard(request);
      const user = await resolveUser(request);
      if (!user) {
        return jsonError(401, "Sessão expirada ou inválida. Entre novamente.", { code: "UNAUTHENTICATED" });
      }
      if (auth === "admin" && user.role !== "ADMIN") {
        return jsonError(403, "Acesso restrito a administradores.", { code: "FORBIDDEN" });
      }
      const params = (context ? await context.params : {}) as P;
      return await handler({ request, params, user });
    } catch (error) {
      return toErrorResponse(error);
    }
  }) as RouteHandler<P>;
}

/** Rota pública (com checagem de origem em métodos que alteram estado). */
export function publicRoute<P extends Record<string, string> = NoParams>(
  handler: (context: PublicHandlerContext<P>) => Promise<Response>,
): RouteHandler<P> {
  return (async (request: Request, context?: RouteContext<P>) => {
    try {
      await guard(request);
      const params = (context ? await context.params : {}) as P;
      return await handler({ request, params, user: await resolveUser(request) });
    } catch (error) {
      return toErrorResponse(error);
    }
  }) as RouteHandler<P>;
}
