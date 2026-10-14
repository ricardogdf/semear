import { Prisma, type UserRole } from "@prisma/client";

import { issueSetupCode, normalizeEmail, revokeUserSessions, type SessionUser } from "./auth";
import { prisma } from "./client";
import { DomainError } from "./errors";

interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  hasPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdByName: string | null;
  pendingSetupCodeExpiresAt: string | null;
}

function assertAdmin(actor: SessionUser) {
  if (actor.role !== "ADMIN") {
    throw new DomainError("FORBIDDEN", "Apenas administradores podem realizar esta operação.");
  }
}

export async function listUsers(actor: SessionUser): Promise<AdminUserSummary[]> {
  assertAdmin(actor);

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      createdBy: { select: { name: true } },
      passwordSetupTokens: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { expiresAt: true },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    hasPassword: Boolean(user.passwordHash),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    createdByName: user.createdBy?.name ?? null,
    pendingSetupCodeExpiresAt: user.passwordSetupTokens[0]?.expiresAt.toISOString() ?? null,
  }));
}

export async function createUserByAdmin(
  actor: SessionUser,
  input: { name: string; email: string; role: UserRole },
) {
  assertAdmin(actor);
  const email = normalizeEmail(input.email);

  try {
    const user = await prisma.user.create({
      data: { name: input.name.trim(), email, role: input.role, createdById: actor.id },
    });
    const setup = await issueSetupCode(user.id, actor.id);
    return { userId: user.id, setupCode: setup.code, setupCodeExpiresAt: setup.expiresAt.toISOString() };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DomainError("CONFLICT", "Já existe um usuário com este e-mail.");
    }
    throw error;
  }
}

async function countActiveAdmins(tx: Prisma.TransactionClient, excludingUserId?: string) {
  return tx.user.count({
    where: { role: "ADMIN", isActive: true, ...(excludingUserId ? { NOT: { id: excludingUserId } } : {}) },
  });
}

/**
 * Atualiza nome, papel e/ou status. Regras:
 * - o administrador não altera o próprio papel nem desativa a própria conta;
 * - nunca deixa o sistema sem administrador ativo;
 * - desativar encerra imediatamente as sessões do usuário.
 */
export async function updateUserByAdmin(
  actor: SessionUser,
  userId: string,
  changes: { name?: string; role?: UserRole; isActive?: boolean },
) {
  assertAdmin(actor);

  if (actor.id === userId && (changes.role !== undefined || changes.isActive !== undefined)) {
    throw new DomainError(
      "FORBIDDEN",
      "Você não pode alterar o próprio papel nem desativar a própria conta.",
    );
  }

  const updated = await prisma
    .$transaction(
    async (tx) => {
      const target = await tx.user.findUnique({ where: { id: userId } });
      if (!target) {
        throw new DomainError("NOT_FOUND", "Usuário não encontrado.");
      }

      const losesAdmin =
        target.role === "ADMIN" &&
        target.isActive &&
        ((changes.role !== undefined && changes.role !== "ADMIN") || changes.isActive === false);

      if (losesAdmin && (await countActiveAdmins(tx, target.id)) === 0) {
        throw new DomainError("CONFLICT", "O sistema precisa de pelo menos um administrador ativo.");
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
          ...(changes.role !== undefined ? { role: changes.role } : {}),
          ...(changes.isActive !== undefined ? { isActive: changes.isActive } : {}),
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
    .catch((error: unknown) => {
      // Conflito de serialização: outra alteração simultânea de administradores.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new DomainError("CONFLICT", "Outra alteração de administradores ocorreu ao mesmo tempo. Tente novamente.");
      }
      throw error;
    });

  if (changes.isActive === false || changes.role !== undefined) {
    // Sessões são revalidadas a cada requisição, mas revogamos para efeito imediato.
    await revokeUserSessions(userId);
  }

  return { id: updated.id, role: updated.role, isActive: updated.isActive };
}

/** Gera um novo código de primeiro acesso / redefinição de senha para outro usuário. */
export async function issueSetupCodeByAdmin(actor: SessionUser, userId: string) {
  assertAdmin(actor);

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    throw new DomainError("NOT_FOUND", "Usuário não encontrado.");
  }
  if (!target.isActive) {
    throw new DomainError("CONFLICT", "Reative a conta antes de gerar um novo código.");
  }

  const setup = await issueSetupCode(userId, actor.id);
  return { setupCode: setup.code, setupCodeExpiresAt: setup.expiresAt.toISOString() };
}

/**
 * Inicializa o primeiro administrador (usado apenas pelo comando `admin:create`).
 * Recusa a operação se já existir um administrador ativo, a menos que seja para
 * reemitir o código de um administrador existente (recuperação de acesso pelo servidor).
 */
export async function bootstrapAdmin(input: { email: string; name?: string; reissue?: boolean }) {
  const email = normalizeEmail(input.email);
  const activeAdmins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });
  const existing = await prisma.user.findUnique({ where: { email } });

  if (input.reissue) {
    if (!existing || existing.role !== "ADMIN" || !existing.isActive) {
      throw new DomainError("NOT_FOUND", "Não há administrador ativo com este e-mail.");
    }
    const setup = await issueSetupCode(existing.id, null);
    return { userId: existing.id, created: false, promoted: false, ...setup };
  }

  if (activeAdmins.length > 0) {
    throw new DomainError(
      "CONFLICT",
      "Já existe um administrador ativo. Novos usuários devem ser criados pela área administrativa.",
    );
  }

  if (existing) {
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { role: "ADMIN", isActive: true },
    });
    await revokeUserSessions(user.id);
    const setup = await issueSetupCode(user.id, null);
    return { userId: user.id, created: false, promoted: true, ...setup };
  }

  if (!input.name?.trim()) {
    throw new DomainError("VALIDATION", "Informe o nome do administrador (--name).");
  }

  const user = await prisma.user.create({ data: { email, name: input.name.trim(), role: "ADMIN" } });
  const setup = await issueSetupCode(user.id, null);
  return { userId: user.id, created: true, promoted: false, ...setup };
}
