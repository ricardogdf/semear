import { Prisma, type ContentProcessingStatus } from "@prisma/client";

import { compareTitles, type ModuleSnapshot } from "@/lib/utils";

import { prisma } from "./client";
import { DomainError } from "./errors";
import { toQuestionArray } from "./mappers";

/** Limite por matéria, para que o cadastro de módulos não cresça sem controle. */
const MAX_MODULES_PER_SUBJECT = 50;

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Aula com os campos usados nas contagens por módulo. */
interface ModuleStatsContent {
  id: string;
  moduleId: string | null;
  processingStatus: ContentProcessingStatus;
  trainingQuestions: Prisma.JsonValue;
}

/** Questões disponíveis para simulado: só as das aulas com conteúdo didático processado. */
export function countAvailableQuestions(
  contents: Array<Pick<ModuleStatsContent, "processingStatus" | "trainingQuestions">>,
) {
  return contents
    .filter((content) => content.processingStatus === "COMPLETED")
    .reduce((total, content) => total + toQuestionArray(content.trainingQuestions).length, 0);
}

/** Módulos da matéria em ordem de nome, com as contagens de aulas e de questões. */
export function buildModuleSnapshots(
  modules: Array<{ id: string; title: string }>,
  contents: ModuleStatsContent[],
): ModuleSnapshot[] {
  return [...modules]
    .sort((left, right) => compareTitles(left.title, right.title))
    .map((entry) => {
      const lessons = contents.filter((content) => content.moduleId === entry.id);
      return {
        id: entry.id,
        title: entry.title,
        contentCount: lessons.length,
        availableQuestionCount: countAvailableQuestions(lessons),
      };
    });
}

function duplicateTitleError() {
  return new DomainError("CONFLICT", "Esta matéria já tem um módulo com este nome.");
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Nomes de módulo são únicos na matéria sem diferenciar maiúsculas ("Divisão" = "divisão"). */
async function assertTitleAvailable(client: DbClient, subjectId: string, title: string, exceptId?: string) {
  const clash = await client.subjectModule.findFirst({
    where: { subjectId, title: { equals: title, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    throw duplicateTitleError();
  }
}

async function assertBelowLimit(client: DbClient, subjectId: string) {
  if ((await client.subjectModule.count({ where: { subjectId } })) >= MAX_MODULES_PER_SUBJECT) {
    throw new DomainError("CONFLICT", `Limite de ${MAX_MODULES_PER_SUBJECT} módulos por matéria atingido.`);
  }
}

/** Módulo da matéria com este nome (sem diferenciar maiúsculas); cria um novo se não houver. */
export async function findOrCreateModule(tx: Prisma.TransactionClient, subjectId: string, title: string) {
  const existing = await tx.subjectModule.findFirst({
    where: { subjectId, title: { equals: title, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing;

  await assertBelowLimit(tx, subjectId);
  return tx.subjectModule.create({ data: { title, subjectId }, select: { id: true } });
}

async function findOwnedModule(userId: string, moduleId: string) {
  const found = await prisma.subjectModule.findFirst({
    where: { id: moduleId, subject: { userId } },
    select: { id: true, subjectId: true },
  });
  if (!found) {
    throw new DomainError("NOT_FOUND", "Módulo não encontrado.");
  }
  return found;
}

export async function createModule(userId: string, subjectId: string, title: string) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
  if (!subject) {
    throw new DomainError("NOT_FOUND", "Matéria não encontrada.");
  }

  await assertBelowLimit(prisma, subject.id);
  await assertTitleAvailable(prisma, subject.id, title);
  try {
    return await prisma.subjectModule.create({
      data: { title, subjectId: subject.id },
      select: { id: true, title: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateTitleError();
    throw error;
  }
}

export async function renameModule(userId: string, moduleId: string, title: string) {
  const target = await findOwnedModule(userId, moduleId);
  await assertTitleAvailable(prisma, target.subjectId, title, target.id);
  try {
    return await prisma.subjectModule.update({
      where: { id: target.id },
      data: { title },
      select: { id: true, title: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicateTitleError();
    throw error;
  }
}

/** Exclui o módulo. As aulas continuam na matéria, sem módulo, e os simulados ficam no histórico. */
export async function deleteModule(userId: string, moduleId: string) {
  const deleted = await prisma.subjectModule.deleteMany({ where: { id: moduleId, subject: { userId } } });
  if (deleted.count === 0) {
    throw new DomainError("NOT_FOUND", "Módulo não encontrado.");
  }
}
