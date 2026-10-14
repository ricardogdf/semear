import type { Prisma} from "@prisma/client";
import { type AiProvider, type ContentProcessingStatus } from "@prisma/client";

import { AiProviderError, credentialErrorCodes, processLesson } from "@/server/ai";
import type { ContentDetailSnapshot } from "@/lib/utils";

import { getProviderClient, recordCredentialError, resolveAiSelection } from "./ai-credentials";
import { prisma } from "./client";
import { DomainError } from "./errors";
import { mapContentDetail } from "./mappers";
import { consumeRateLimit } from "./rate-limit";

const UPLOADS_PER_HOUR = 30;
/** Um processamento parado há mais tempo que isso é considerado interrompido e pode ser refeito. */
const STALE_PROCESSING_MS = 15 * 60 * 1000;
const PROCESSING_TIMEOUT_MS = 180_000;

interface AiChoice {
  provider?: AiProvider;
  model?: string;
}

async function findOrCreateSubject(tx: Prisma.TransactionClient, userId: string, subjectRef: string) {
  const ref = subjectRef.trim();

  const byId = await tx.subject.findFirst({ where: { id: ref, userId }, select: { id: true } });
  if (byId) return byId;

  const byTitle = await tx.subject.findFirst({
    where: { userId, title: { equals: ref, mode: "insensitive" } },
    select: { id: true },
  });
  if (byTitle) return byTitle;

  return tx.subject.create({
    data: {
      title: ref,
      instructor: "Não definido",
      workloadHours: 0,
      status: "IN_PROGRESS",
      progress: 0,
      difficulty: 50,
      userId,
    },
    select: { id: true },
  });
}

async function loadOwnedContent(userId: string, contentId: string) {
  const content = await prisma.content.findFirst({
    where: { id: contentId, subject: { userId } },
    include: { subject: { select: { id: true, title: true } } },
  });
  if (!content) {
    throw new DomainError("NOT_FOUND", "Aula não encontrada.");
  }
  return content;
}

/**
 * Executa o pipeline de IA para uma aula já salva, registrando o histórico da execução.
 * Falhas técnicas deixam a aula como FAILED (sem apagar material anterior) e são relançadas.
 */
async function runProcessing(userId: string, contentId: string, choice: AiChoice) {
  const selection = await resolveAiSelection(userId, choice);
  const content = await prisma.content.findUniqueOrThrow({ where: { id: contentId } });

  const run = await prisma.contentProcessingRun.create({
    data: { contentId, userId, provider: selection.provider, model: selection.model },
  });
  await prisma.content.update({
    where: { id: contentId },
    data: { processingStatus: "PROCESSING", errorCode: null, errorMessage: null },
  });

  try {
    const client = getProviderClient(selection.provider, selection.apiKey, { timeoutMs: PROCESSING_TIMEOUT_MS });
    const result = await processLesson(client, selection.model, content.body);

    await prisma.$transaction([
      prisma.content.update({
        where: { id: contentId },
        data: {
          processingStatus: result.outcome as ContentProcessingStatus,
          classification: result.classification,
          classificationReason: result.reason,
          relevantExcerpts: result.relevantExcerpts,
          summary: result.summary,
          shortSummary: result.shortSummary,
          importantTopics: result.keywords.join(", "),
          trainingQuestions: result.questions as unknown as Prisma.InputJsonValue,
          inputTruncated: result.inputTruncated,
          aiProvider: selection.provider,
          aiModel: selection.model,
          processedAt: new Date(),
          errorCode: null,
          errorMessage: null,
        },
      }),
      prisma.contentProcessingRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCEEDED",
          classification: result.classification,
          reason: result.reason,
          questionsGenerated: result.questions.length,
          finishedAt: new Date(),
        },
      }),
    ]);
  } catch (error) {
    const providerError = error instanceof AiProviderError ? error : null;
    const errorCode = providerError?.code ?? "INTERNAL";
    const userMessage = providerError?.message ?? "Erro interno ao processar a aula. Tente novamente.";
    const detail = providerError
      ? [providerError.httpStatus ? `HTTP ${providerError.httpStatus}` : null, providerError.detail]
          .filter(Boolean)
          .join(" — ")
      : error instanceof Error
        ? error.name
        : "unknown";

    await prisma.$transaction([
      prisma.content.update({
        where: { id: contentId },
        data: {
          processingStatus: "FAILED",
          aiProvider: selection.provider,
          aiModel: selection.model,
          errorCode,
          errorMessage: userMessage,
        },
      }),
      prisma.contentProcessingRun.update({
        where: { id: run.id },
        data: { status: "FAILED", errorCode, errorMessage: detail.slice(0, 500) || null, finishedAt: new Date() },
      }),
    ]);

    if (providerError && credentialErrorCodes.has(providerError.code)) {
      await recordCredentialError(userId, selection.provider, providerError.code);
    }
  }

  return mapContentDetail(await loadOwnedContent(userId, contentId));
}

/**
 * Salva a aula enviada e a processa com o provedor/modelo escolhido.
 * Valida a seleção de IA antes de salvar: sem credencial válida, nada é gravado.
 */
export async function createAndProcessContent(
  userId: string,
  input: { subjectRef: string; body: string; originalFileName: string; source: "TXT" | "PDF" } & AiChoice,
): Promise<ContentDetailSnapshot> {
  if (!input.body.trim()) {
    throw new DomainError("VALIDATION", "Não foi possível extrair texto do arquivo.");
  }

  await resolveAiSelection(userId, input);
  await consumeRateLimit(
    `upload:user:${userId}`,
    UPLOADS_PER_HOUR,
    60 * 60 * 1000,
    `Limite de ${UPLOADS_PER_HOUR} envios por hora atingido. Tente novamente mais tarde.`,
  );

  const content = await prisma.$transaction(async (tx) => {
    const subject = await findOrCreateSubject(tx, userId, input.subjectRef);
    const created = await tx.content.create({
      data: {
        title: input.originalFileName.replace(/\.[^.]+$/, "").trim() || "Aula sem título",
        originalFileName: input.originalFileName,
        source: input.source,
        body: input.body,
        processingStatus: "PROCESSING",
        subjectId: subject.id,
      },
    });
    await tx.subject.update({ where: { id: subject.id }, data: { updatedAt: new Date() } });
    return created;
  });

  return runProcessing(userId, content.id, input);
}

/** Reprocessa uma aula do próprio usuário, com o mesmo ou outro provedor/modelo. */
export async function reprocessContent(userId: string, contentId: string, choice: AiChoice) {
  const content = await loadOwnedContent(userId, contentId);

  const stillRunning =
    content.processingStatus === "PROCESSING" &&
    Date.now() - content.updatedAt.getTime() < STALE_PROCESSING_MS;
  if (stillRunning) {
    throw new DomainError("CONFLICT", "Esta aula ainda está sendo processada. Aguarde a conclusão.");
  }

  await consumeRateLimit(
    `upload:user:${userId}`,
    UPLOADS_PER_HOUR,
    60 * 60 * 1000,
    `Limite de ${UPLOADS_PER_HOUR} processamentos por hora atingido. Tente novamente mais tarde.`,
  );

  return runProcessing(userId, content.id, choice);
}

export async function getContentProcessingHistory(userId: string, contentId: string) {
  await loadOwnedContent(userId, contentId);
  const runs = await prisma.contentProcessingRun.findMany({
    where: { contentId, userId },
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  return runs.map((run) => ({
    id: run.id,
    provider: run.provider,
    model: run.model,
    status: run.status,
    classification: run.classification,
    reason: run.reason,
    questionsGenerated: run.questionsGenerated,
    errorCode: run.errorCode,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  }));
}

export async function deleteContent(userId: string, contentId: string) {
  const deleted = await prisma.content.deleteMany({ where: { id: contentId, subject: { userId } } });
  if (deleted.count === 0) {
    throw new DomainError("NOT_FOUND", "Aula não encontrada.");
  }
}
