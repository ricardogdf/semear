import { prisma } from "./client";
import { DomainError } from "./errors";

/**
 * Limitação de taxa persistida no banco (funciona com várias instâncias da aplicação).
 * Cada chamada registra um evento; acima do limite na janela, lança RATE_LIMITED.
 */
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message = "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
) {
  const count = await countRateLimitEvents(key, windowMs);

  if (count >= limit) {
    throw new DomainError("RATE_LIMITED", message);
  }

  await recordRateLimitEvent(key);
}

/** Conta eventos sem registrar um novo (ex.: falhas de login). */
export async function countRateLimitEvents(key: string, windowMs: number) {
  return prisma.rateLimitEvent.count({
    where: { key, createdAt: { gte: new Date(Date.now() - windowMs) } },
  });
}

export async function recordRateLimitEvent(key: string) {
  await prisma.rateLimitEvent.create({ data: { key } });
}

export async function clearRateLimitEvents(key: string) {
  await prisma.rateLimitEvent.deleteMany({ where: { key } });
}

/** Remove eventos com mais de 1 dia (dados técnicos de limitação, não pertencem a usuários). */
export async function pruneRateLimitEvents() {
  await prisma.rateLimitEvent.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
}
