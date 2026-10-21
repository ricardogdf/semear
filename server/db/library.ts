import { Prisma, type Visibility } from "@prisma/client";

import type { ImportResult, Page, PublicSubjectCardSnapshot, PublicSubjectDetailSnapshot } from "@/lib/utils";

import { prisma } from "./client";
import { DomainError } from "./errors";
import { authorSelect, mapAuthor, pageWindow, publicName, toPage, toQuestionArray } from "./mappers";
import { consumeRateLimit } from "./rate-limit";

const IMPORTS_PER_HOUR = 30;
const PROFILE_SUBJECTS_LIMIT = 50;
const MAX_TITLE_LENGTH = 120;
const IMPORT_ATTEMPTS = 3;

/**
 * Matéria que aparece na biblioteca pública: original (nunca uma cópia importada), pública e de
 * uma conta ativa. Usado em listagens, rankings, detalhes e na importação.
 */
const publicOriginal = {
  visibility: "PUBLIC",
  isImported: false,
  user: { isActive: true },
} satisfies Prisma.SubjectWhereInput;

const publicSubjectSelect = {
  id: true,
  title: true,
  description: true,
  publishedAt: true,
  userId: true,
  user: { select: authorSelect },
  _count: { select: { imports: true, contents: true, modules: true } },
} satisfies Prisma.SubjectSelect;

type PublicSubjectRow = Prisma.SubjectGetPayload<{ select: typeof publicSubjectSelect }>;

/** Cópias do visitante entre estas matérias, numa única consulta. */
async function copiesOf(viewerId: string | null, originalIds: string[]) {
  if (!viewerId || originalIds.length === 0) return new Map<string, string>();
  const copies = await prisma.subject.findMany({
    where: { userId: viewerId, importedFromId: { in: originalIds } },
    select: { id: true, importedFromId: true },
  });
  return new Map(copies.map((copy) => [copy.importedFromId!, copy.id]));
}

async function toCards(viewerId: string | null, rows: PublicSubjectRow[]): Promise<PublicSubjectCardSnapshot[]> {
  const copies = await copiesOf(
    viewerId,
    rows.map((row) => row.id),
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    author: mapAuthor(row.user),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    // Contagem derivada das cópias existentes: excluir uma cópia decrementa automaticamente.
    importCount: row._count.imports,
    contentCount: row._count.contents,
    moduleCount: row._count.modules,
    importedCopyId: copies.get(row.id) ?? null,
    isOwner: row.userId === viewerId,
  }));
}

/**
 * Publica ou despublica uma matéria do próprio usuário. Cópias importadas nunca podem ser
 * publicadas: a regra é verificada aqui e, de novo, por um CHECK no banco.
 */
export async function setSubjectVisibility(
  userId: string,
  subjectId: string,
  input: { visibility: Visibility; description?: string },
) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    select: { id: true, isImported: true, publishedAt: true, _count: { select: { contents: true } } },
  });
  if (!subject) {
    throw new DomainError("NOT_FOUND", "Matéria não encontrada.");
  }

  if (input.visibility === "PUBLIC") {
    if (subject.isImported) {
      throw new DomainError(
        "FORBIDDEN",
        "Matérias importadas não podem ser publicadas. Compartilhe o link da matéria original.",
      );
    }
    if (subject._count.contents === 0) {
      throw new DomainError("PRECONDITION_FAILED", "Envie ao menos uma aula antes de publicar a matéria.");
    }
  }

  await prisma.subject.update({
    where: { id: subject.id },
    data: {
      visibility: input.visibility,
      publishedAt: input.visibility === "PUBLIC" ? (subject.publishedAt ?? new Date()) : null,
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });
}

/** Biblioteca pública: matérias originais publicadas, por data de publicação ou por importações. */
export async function listPublicSubjects(
  viewerId: string,
  filters: { q: string; sort: "recent" | "popular"; page: number },
): Promise<Page<PublicSubjectCardSnapshot>> {
  const contains = { contains: filters.q, mode: "insensitive" as const };
  const rows = await prisma.subject.findMany({
    where: {
      ...publicOriginal,
      ...(filters.q ? { OR: [{ title: contains }, { description: contains }] } : {}),
    },
    select: publicSubjectSelect,
    orderBy:
      filters.sort === "popular"
        ? [{ imports: { _count: "desc" } }, { publishedAt: "desc" }, { id: "asc" }]
        : [{ publishedAt: "desc" }, { id: "asc" }],
    ...pageWindow(filters.page),
  });
  return toPage(await toCards(viewerId, rows), filters.page);
}

/**
 * Ranking: matérias originais públicas com ao menos uma importação ativa, da mais importada para a
 * menos importada. Empate: publicação mais recente e, por fim, o identificador.
 */
export async function rankSubjects(viewerId: string, page: number): Promise<Page<PublicSubjectCardSnapshot>> {
  const rows = await prisma.subject.findMany({
    where: { ...publicOriginal, imports: { some: {} } },
    select: publicSubjectSelect,
    orderBy: [{ imports: { _count: "desc" } }, { publishedAt: "desc" }, { id: "asc" }],
    ...pageWindow(page),
  });
  return toPage(await toCards(viewerId, rows), page);
}

/** Matérias publicadas que aparecem no perfil do autor. */
export async function listProfileSubjects(viewerId: string | null, authorId: string) {
  const rows = await prisma.subject.findMany({
    where: { ...publicOriginal, userId: authorId },
    select: publicSubjectSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: PROFILE_SUBJECTS_LIMIT,
  });
  return toCards(viewerId, rows);
}

/**
 * Página pública da matéria: aberta a qualquer pessoa se for um original público; o dono também
 * a vê enquanto privada. Cópias importadas nunca têm página pública (respondem como inexistentes).
 * Mostra só uma prévia das aulas: o texto completo vem apenas com a importação.
 */
export async function getPublicSubject(
  viewerId: string | null,
  subjectId: string,
): Promise<PublicSubjectDetailSnapshot> {
  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      isImported: false,
      OR: [publicOriginal, ...(viewerId ? [{ userId: viewerId }] : [])],
    },
    select: {
      ...publicSubjectSelect,
      visibility: true,
      modules: { select: { id: true, title: true }, orderBy: { title: "asc" } },
      contents: {
        select: { id: true, title: true, moduleId: true, shortSummary: true, trainingQuestions: true, processingStatus: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!subject) {
    throw new DomainError("NOT_FOUND", "Matéria não encontrada ou não pública.");
  }

  const [card] = await toCards(viewerId, [subject]);
  return {
    ...card!,
    visibility: subject.visibility,
    modules: subject.modules,
    contents: subject.contents.map((content) => ({
      id: content.id,
      title: content.title,
      moduleId: content.moduleId,
      shortSummary: content.shortSummary,
      questionCount: content.processingStatus === "COMPLETED" ? toQuestionArray(content.trainingQuestions).length : 0,
    })),
  };
}

/** Título livre na biblioteca do usuário ("Cálculo", "Cálculo (importada)", "Cálculo (importada 2)"…). */
async function availableTitle(tx: Prisma.TransactionClient, userId: string, title: string) {
  const base = title.slice(0, MAX_TITLE_LENGTH - 16).trim();
  const existing = await tx.subject.findMany({
    where: { userId, title: { startsWith: base, mode: "insensitive" } },
    select: { title: true },
  });
  const taken = new Set(existing.map((entry) => entry.title.toLocaleLowerCase("pt-BR")));
  const candidates = [title, `${base} (importada)`];
  for (let index = 2; index < 1000; index += 1) candidates.push(`${base} (importada ${index})`);
  return candidates.find((candidate) => !taken.has(candidate.toLocaleLowerCase("pt-BR")))!;
}

function uniqueViolationTarget(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return JSON.stringify(error.meta?.target ?? "");
  }
  return null;
}

/**
 * Cria a cópia em uma transação. O original é travado (FOR SHARE) até o fim: se o dono o tornar
 * privado ou excluí-lo ao mesmo tempo, uma das operações espera a outra, e uma matéria que deixou
 * de ser pública nunca é copiada.
 */
async function copySubject(userId: string, originalId: string) {
  return prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT s."id" FROM "Subject" s JOIN "User" u ON u."id" = s."userId"
        WHERE s."id" = ${originalId} AND s."visibility" = 'PUBLIC' AND s."isImported" = false AND u."isActive" = true
        FOR SHARE OF s`;
      if (locked.length === 0) {
        throw new DomainError("NOT_FOUND", "Matéria pública não encontrada.");
      }

      const original = await tx.subject.findUniqueOrThrow({
        where: { id: originalId },
        include: { user: { select: authorSelect }, modules: true, contents: true },
      });
      if (original.userId === userId) {
        throw new DomainError("CONFLICT", "Esta matéria já é sua.");
      }

      const copy = await tx.subject.create({
        data: {
          title: await availableTitle(tx, userId, original.title),
          instructor: original.instructor,
          workloadHours: original.workloadHours,
          difficulty: original.difficulty,
          status: "IN_PROGRESS",
          progress: 0,
          description: original.description,
          visibility: "PRIVATE",
          userId,
          isImported: true,
          importedFromId: original.id,
          importedFromOwnerId: original.userId,
          importedFromTitle: original.title,
          importedFromAuthorName: publicName(original.user),
          importedAt: new Date(),
        },
        select: { id: true },
      });

      const moduleIds = new Map<string, string>();
      for (const entry of original.modules) {
        const created = await tx.subjectModule.create({
          data: { title: entry.title, subjectId: copy.id },
          select: { id: true },
        });
        moduleIds.set(entry.id, created.id);
      }

      // Texto e material gerado são copiados: a cópia é independente e usa a IA do próprio usuário.
      await tx.content.createMany({
        data: original.contents.map((content) => {
          const interrupted = content.processingStatus === "PROCESSING";
          return {
            title: content.title,
            originalFileName: content.originalFileName,
            source: content.source,
            body: content.body,
            shortSummary: content.shortSummary,
            summary: content.summary,
            importantTopics: content.importantTopics,
            trainingQuestions: content.trainingQuestions as Prisma.InputJsonValue,
            relevantExcerpts: content.relevantExcerpts as Prisma.InputJsonValue,
            processingStatus: interrupted ? "FAILED" : content.processingStatus,
            classification: content.classification,
            classificationReason: content.classificationReason,
            aiProvider: content.aiProvider,
            aiModel: content.aiModel,
            inputTruncated: content.inputTruncated,
            processedAt: content.processedAt,
            errorCode: interrupted ? "INTERRUPTED" : content.errorCode,
            errorMessage: interrupted
              ? "O processamento desta aula não tinha terminado no original. Reprocesse com o seu provedor de IA."
              : content.errorMessage,
            subjectId: copy.id,
            moduleId: content.moduleId ? (moduleIds.get(content.moduleId) ?? null) : null,
          };
        }),
      });

      return copy;
    },
    { timeout: 30_000 },
  );
}

/**
 * Importa uma matéria pública para a biblioteca pessoal. Só matérias (tabela Subject) passam por
 * aqui: não existe importação de publicações acadêmicas. Uma importação ativa por usuário por
 * original, garantida pelo índice único (userId, importedFromId) mesmo com requisições simultâneas.
 */
export async function importSubject(userId: string, originalId: string): Promise<ImportResult> {
  const existing = await prisma.subject.findFirst({
    where: { userId, importedFromId: originalId },
    select: { id: true },
  });
  if (existing) {
    return { subjectId: existing.id, alreadyImported: true };
  }

  await consumeRateLimit(
    `import:user:${userId}`,
    IMPORTS_PER_HOUR,
    60 * 60 * 1000,
    `Limite de ${IMPORTS_PER_HOUR} importações por hora atingido. Tente novamente mais tarde.`,
  );

  for (let attempt = 1; ; attempt += 1) {
    try {
      const copy = await copySubject(userId, originalId);
      return { subjectId: copy.id, alreadyImported: false };
    } catch (error) {
      const target = uniqueViolationTarget(error);
      if (target?.includes("importedFromId")) {
        // Outra requisição simultânea do mesmo usuário importou primeiro: devolve a cópia dela.
        const winner = await prisma.subject.findFirstOrThrow({
          where: { userId, importedFromId: originalId },
          select: { id: true },
        });
        return { subjectId: winner.id, alreadyImported: true };
      }
      // Título ocupado por outra importação simultânea: tenta de novo com o próximo título livre.
      if (target !== null && attempt < IMPORT_ATTEMPTS) continue;
      if (target !== null) {
        throw new DomainError("CONFLICT", "Não foi possível importar agora. Tente novamente.");
      }
      throw error;
    }
  }
}
