import type { UserRole } from "@prisma/client";

import { prisma } from "./client";
import { DomainError } from "./errors";
import {
  clearRateLimitEvents,
  countRateLimitEvents,
  pruneRateLimitEvents,
  recordRateLimitEvent,
} from "./rate-limit";
import {
  burnPasswordVerification,
  getPasswordPolicyError,
  hashPassword,
  verifyPassword,
} from "./security/password";
import { generateSessionToken, generateSetupCode, hashSetupCode, hashToken } from "./security/tokens";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SETUP_CODE_TTL_MS = 72 * 60 * 60 * 1000;
const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES_PER_EMAIL = 5;
const LOGIN_MAX_FAILURES_PER_IP = 30;
const SETUP_MAX_FAILURES_PER_EMAIL = 5;
const SETUP_MAX_FAILURES_PER_IP = 20;

const INVALID_CREDENTIALS = "E-mail ou senha inválidos.";
const INVALID_SETUP_CODE = "Código inválido ou expirado. Solicite um novo código ao administrador.";
const TOO_MANY_ATTEMPTS = "Muitas tentativas. Aguarde 15 minutos e tente novamente.";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function createSession(userId: string, context: RequestContext) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent?.slice(0, 300) ?? null,
    },
  });

  return { token, expiresAt };
}

async function assertNotLocked(keys: Array<[string, number]>) {
  for (const [key, limit] of keys) {
    if ((await countRateLimitEvents(key, LOGIN_WINDOW_MS)) >= limit) {
      throw new DomainError("RATE_LIMITED", TOO_MANY_ATTEMPTS);
    }
  }
}

/**
 * Autentica por e-mail e senha. Qualquer falha (e-mail inexistente, conta inativa,
 * senha ainda não definida ou incorreta) gera a mesma mensagem e custo de tempo semelhante.
 */
export async function login(email: string, password: string, context: RequestContext) {
  const normalizedEmail = normalizeEmail(email);
  const emailKey = `login:email:${normalizedEmail}`;
  const ipKey = `login:ip:${context.ipAddress ?? "unknown"}`;

  await assertNotLocked([
    [emailKey, LOGIN_MAX_FAILURES_PER_EMAIL],
    [ipKey, LOGIN_MAX_FAILURES_PER_IP],
  ]);

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  let valid = false;
  if (user?.passwordHash && user.isActive) {
    valid = await verifyPassword(password, user.passwordHash);
  } else {
    await burnPasswordVerification(password);
  }

  if (!valid || !user) {
    await recordRateLimitEvent(emailKey);
    await recordRateLimitEvent(ipKey);
    throw new DomainError("UNAUTHENTICATED", INVALID_CREDENTIALS);
  }

  await clearRateLimitEvents(emailKey);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  // Limpeza oportunista de dados técnicos expirados.
  await Promise.all([
    prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    pruneRateLimitEvents(),
  ]);

  const session = await createSession(user.id, context);
  return {
    ...session,
    user: { id: user.id, name: user.name, email: user.email, role: user.role } satisfies SessionUser,
  };
}

/** Resolve o usuário de um token de sessão. Retorna null se inválido, expirado ou conta inativa. */
export async function getSessionUser(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } },
  });

  if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
    return null;
  }

  if (Date.now() - session.lastUsedAt.getTime() > SESSION_TOUCH_INTERVAL_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  }

  const { isActive: _isActive, ...user } = session.user;
  return user;
}

export async function logout(token: string | undefined | null) {
  if (!token) {
    return;
  }
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function revokeUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

/**
 * Gera um novo código de primeiro acesso/redefinição para o usuário, invalidando os anteriores.
 * O código em texto puro só existe no retorno desta função; o banco guarda apenas o hash.
 */
export async function issueSetupCode(userId: string, issuedById: string | null) {
  const code = generateSetupCode();
  const expiresAt = new Date(Date.now() + SETUP_CODE_TTL_MS);

  await prisma.$transaction([
    prisma.passwordSetupToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordSetupToken.create({
      data: { userId, tokenHash: hashSetupCode(code), expiresAt, createdById: issuedById },
    }),
  ]);

  return { code, expiresAt };
}

/** Define a senha usando um código de uso único e já abre uma sessão. */
export async function completePasswordSetup(
  input: { email: string; code: string; password: string },
  context: RequestContext,
) {
  const policyError = getPasswordPolicyError(input.password);
  if (policyError) {
    throw new DomainError("VALIDATION", policyError);
  }

  const normalizedEmail = normalizeEmail(input.email);
  const emailKey = `setup:email:${normalizedEmail}`;
  const ipKey = `setup:ip:${context.ipAddress ?? "unknown"}`;

  await assertNotLocked([
    [emailKey, SETUP_MAX_FAILURES_PER_EMAIL],
    [ipKey, SETUP_MAX_FAILURES_PER_IP],
  ]);

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  const token =
    user && user.isActive
      ? await prisma.passwordSetupToken.findFirst({
          where: {
            userId: user.id,
            tokenHash: hashSetupCode(input.code),
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
        })
      : null;

  if (!user || !token) {
    await recordRateLimitEvent(emailKey);
    await recordRateLimitEvent(ipKey);
    throw new DomainError("VALIDATION", INVALID_SETUP_CODE);
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.passwordSetupToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    prisma.passwordSetupToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordUpdatedAt: new Date(), lastLoginAt: new Date() },
    }),
  ]);

  await clearRateLimitEvents(emailKey);
  const session = await createSession(user.id, context);
  return {
    ...session,
    user: { id: user.id, name: user.name, email: user.email, role: user.role } satisfies SessionUser,
  };
}

/** Troca de senha pelo próprio usuário autenticado. Encerra as demais sessões. */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentToken: string,
) {
  const policyError = getPasswordPolicyError(newPassword);
  if (policyError) {
    throw new DomainError("VALIDATION", policyError);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new DomainError("VALIDATION", "Senha atual incorreta.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword), passwordUpdatedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId, NOT: { tokenHash: hashToken(currentToken) } } }),
  ]);
}
