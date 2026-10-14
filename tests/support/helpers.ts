import type { UserRole } from "@prisma/client";

import type { AiModelInfo, AiProviderClient, AiProviderId, StructuredRequest } from "@/server/ai";
import { prisma, setProviderClientFactoryForTests } from "@/server/db";
import { hashPassword } from "../../server/db/security/password";
import { generateSessionToken, hashToken } from "../../server/db/security/tokens";

export const TEST_PASSWORD = "senha-forte-123";
const ORIGIN = "http://localhost:3000";
let cachedHash: string | undefined;

/** Limpa todas as tabelas do banco de TESTE (o env garante que o nome termina em _test). */
export async function resetDatabase() {
  const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tables.map((table) => `"${table.tablename}"`).join(", ")} CASCADE`,
    );
  }
}

export async function createUser(options: {
  email: string;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  withPassword?: boolean;
}) {
  cachedHash ??= await hashPassword(TEST_PASSWORD);
  return prisma.user.create({
    data: {
      email: options.email,
      name: options.name ?? options.email.split("@")[0]!,
      role: options.role ?? "USER",
      isActive: options.isActive ?? true,
      passwordHash: options.withPassword === false ? null : cachedHash,
    },
  });
}

/** Cria uma sessão diretamente e devolve o cabeçalho Cookie correspondente. */
export async function sessionCookieFor(userId: string) {
  const token = generateSessionToken();
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  return `semear_session=${token}`;
}

export function jsonRequest(
  method: string,
  path: string,
  options: { body?: unknown; cookie?: string; origin?: string | null; ip?: string } = {},
) {
  const headers: Record<string, string> = { host: "localhost:3000" };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (options.cookie) headers.cookie = options.cookie;
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  if (options.ip) headers["x-forwarded-for"] = options.ip;

  return new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export function params<P extends Record<string, string>>(value: P) {
  return { params: Promise.resolve(value) };
}

export function extractSessionCookie(response: Response) {
  const header = response.headers.get("set-cookie") ?? "";
  const match = header.match(/semear_session=([^;]*)/);
  return match?.[1] ? `semear_session=${match[1]}` : null;
}

// ---------- Provedor de IA falso (sem rede) ----------

export type FakeResponder = (request: StructuredRequest<unknown>, model: string) => unknown;

export interface FakeProviderState {
  models: AiModelInfo[];
  listError?: Error;
  responders: Record<string, FakeResponder>;
  calls: Array<{ provider: AiProviderId; model: string; schemaName: string; apiKey: string }>;
}

export function installFakeProvider(overrides: Partial<FakeProviderState> = {}) {
  const state: FakeProviderState = {
    models: [{ id: "fake-model", displayName: "Fake" }],
    responders: {},
    calls: [],
    ...overrides,
  };

  setProviderClientFactoryForTests((provider, options): AiProviderClient => ({
    provider,
    async listModels() {
      if (state.listError) throw state.listError;
      return state.models;
    },
    async generateStructured<T>(model: string, request: StructuredRequest<T>) {
      state.calls.push({ provider, model, schemaName: request.schemaName, apiKey: options.apiKey });
      const responder = state.responders[request.schemaName];
      if (!responder) throw new Error(`Sem resposta configurada para ${request.schemaName}`);
      const raw = responder(request as StructuredRequest<unknown>, model);
      if (raw instanceof Error) throw raw;
      return request.validator.parse(raw);
    },
  }));

  return state;
}

export function uninstallFakeProvider() {
  setProviderClientFactoryForTests(null);
}
