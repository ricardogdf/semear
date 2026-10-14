import type { Prisma} from "@prisma/client";
import { type AccessRequestStatus, type UserRole } from "@prisma/client";

import { issueSetupCode, normalizeEmail, type SessionUser } from "./auth";
import { prisma } from "./client";
import { DomainError } from "./errors";
import { consumeRateLimit } from "./rate-limit";

const REQUESTS_PER_IP_PER_HOUR = 5;
const REQUESTS_PER_EMAIL_PER_DAY = 3;

interface AccessRequestSummary {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: AccessRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  reviewNote: string | null;
  createdUserId: string | null;
  emailAlreadyRegistered: boolean;
}

/**
 * Registra uma solicitação pública. Nunca cria usuário. A resposta é sempre a mesma
 * (inclusive para e-mails já cadastrados ou já pendentes) para não revelar quem tem conta.
 */
export async function submitAccessRequest(input: {
  name: string;
  email: string;
  message?: string | null;
  ipAddress?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const tooMany = "Recebemos muitas solicitações recentes. Tente novamente mais tarde.";

  await consumeRateLimit(`access-request:ip:${input.ipAddress ?? "unknown"}`, REQUESTS_PER_IP_PER_HOUR, 60 * 60 * 1000, tooMany);
  await consumeRateLimit(`access-request:email:${email}`, REQUESTS_PER_EMAIL_PER_DAY, 24 * 60 * 60 * 1000, tooMany);

  const pending = await prisma.accessRequest.findFirst({ where: { email, status: "PENDING" } });

  if (pending) {
    // Atualiza a solicitação existente em vez de criar duplicata.
    await prisma.accessRequest.update({
      where: { id: pending.id },
      data: { name: input.name.trim(), message: input.message?.trim() || pending.message },
    });
    return;
  }

  await prisma.accessRequest.create({
    data: {
      name: input.name.trim(),
      email,
      message: input.message?.trim() || null,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

function assertAdmin(actor: SessionUser) {
  if (actor.role !== "ADMIN") {
    throw new DomainError("FORBIDDEN", "Apenas administradores podem realizar esta operação.");
  }
}

export async function listAccessRequests(
  actor: SessionUser,
  status?: AccessRequestStatus,
): Promise<AccessRequestSummary[]> {
  assertAdmin(actor);

  const requests = await prisma.accessRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { reviewedBy: { select: { name: true } } },
    take: 200,
  });

  const registered = new Set(
    (
      await prisma.user.findMany({
        where: { email: { in: [...new Set(requests.map((request) => request.email))] } },
        select: { email: true },
      })
    ).map((user) => user.email),
  );

  return requests.map((request) => ({
    id: request.id,
    name: request.name,
    email: request.email,
    message: request.message,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    reviewedAt: request.reviewedAt?.toISOString() ?? null,
    reviewedByName: request.reviewedBy?.name ?? null,
    reviewNote: request.reviewNote,
    createdUserId: request.createdUserId,
    emailAlreadyRegistered: registered.has(request.email),
  }));
}

async function getPendingRequest(tx: Prisma.TransactionClient, requestId: string) {
  const request = await tx.accessRequest.findUnique({ where: { id: requestId } });
  if (!request) {
    throw new DomainError("NOT_FOUND", "Solicitação não encontrada.");
  }
  if (request.status !== "PENDING") {
    throw new DomainError("CONFLICT", "Esta solicitação já foi analisada.");
  }
  return request;
}

/** Aprova a solicitação e cria a conta (com código de primeiro acesso) na mesma transação. */
export async function approveAccessRequest(
  actor: SessionUser,
  requestId: string,
  input: { role: UserRole; name?: string; note?: string | null },
) {
  assertAdmin(actor);

  const user = await prisma.$transaction(async (tx) => {
    const request = await getPendingRequest(tx, requestId);

    if (await tx.user.findUnique({ where: { email: request.email } })) {
      throw new DomainError(
        "CONFLICT",
        "Já existe um usuário com este e-mail. Rejeite a solicitação ou gerencie a conta existente.",
      );
    }

    const created = await tx.user.create({
      data: {
        name: (input.name ?? request.name).trim(),
        email: request.email,
        role: input.role,
        createdById: actor.id,
      },
    });

    await tx.accessRequest.update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewedById: actor.id,
        reviewedAt: new Date(),
        reviewNote: input.note?.trim() || null,
        createdUserId: created.id,
      },
    });

    return created;
  });

  const setup = await issueSetupCode(user.id, actor.id);
  return { userId: user.id, setupCode: setup.code, setupCodeExpiresAt: setup.expiresAt.toISOString() };
}

export async function rejectAccessRequest(actor: SessionUser, requestId: string, note?: string | null) {
  assertAdmin(actor);

  await prisma.$transaction(async (tx) => {
    const request = await getPendingRequest(tx, requestId);
    await tx.accessRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewedById: actor.id,
        reviewedAt: new Date(),
        reviewNote: note?.trim() || null,
      },
    });
  });
}
