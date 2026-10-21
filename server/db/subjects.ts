import { Prisma, type Simulation, type SimulationResult, type SubjectStatus } from "@prisma/client";

import {
  calculateAverageScore,
  calculateFinalScore,
  compareTitles,
  normalizeScore,
  type SimulationSubjectSnapshot,
  type SubjectDetailSnapshot,
  type SubjectOption,
  type SubjectScoreSnapshot,
} from "@/lib/utils";

import { prisma } from "./client";
import { DomainError } from "./errors";
import {
  contentRelationsInclude,
  contentSummarySelect,
  mapContentDetail,
  mapContentSummaryRow,
  mapSimulationResult,
} from "./mappers";
import { buildModuleSnapshots, countAvailableQuestions } from "./modules";

type SimulationWithResults = Simulation & { results: SimulationResult[] };
type SimulationWithHistory = SimulationWithResults & { module: { title: string } | null };

/** Notas (0–10) da tentativa mais recente de cada simulado, apenas do próprio usuário. */
function latestNormalizedScores(simulations: SimulationWithResults[]) {
  return simulations.flatMap((simulation) => {
    const latest = simulation.results[0];
    return latest ? [normalizeScore(Number(latest.score), Number(simulation.maxScore))] : [];
  });
}

function allNormalizedScores(simulations: SimulationWithResults[]) {
  return simulations.flatMap((simulation) =>
    simulation.results.map((result) => normalizeScore(Number(result.score), Number(simulation.maxScore))),
  );
}

function mapHistory(simulations: SimulationWithHistory[]) {
  return simulations
    .flatMap((simulation) => simulation.results.map((result) => mapSimulationResult(result, simulation)))
    .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
}

const ownResults = (simulations: SimulationWithResults[]) => simulations.flatMap((simulation) => simulation.results);

const simulationsWithOwnResults = (userId: string) =>
  ({
    include: {
      results: { where: { userId }, orderBy: { submittedAt: "desc" } },
      module: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  }) satisfies Prisma.Subject$simulationsArgs;

const moduleListSelect = { select: { id: true, title: true } } satisfies Prisma.Subject$modulesArgs;

export async function getSubjectsOverview(userId: string, status?: SubjectStatus): Promise<SubjectScoreSnapshot[]> {
  const subjects = await prisma.subject.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: {
      simulations: simulationsWithOwnResults(userId),
      _count: { select: { contents: true, modules: true } },
    },
    orderBy: { title: "asc" },
  });

  return subjects.map((subject) => ({
    subjectId: subject.id,
    title: subject.title,
    status: subject.status,
    visibility: subject.visibility,
    isImported: subject.isImported,
    progress: subject.progress,
    finalScore: calculateFinalScore(latestNormalizedScores(subject.simulations)),
    averageScore: calculateAverageScore(allNormalizedScores(subject.simulations)),
    difficulty: subject.difficulty,
    contentCount: subject._count.contents,
    moduleCount: subject._count.modules,
    attemptCount: subject.simulations.reduce((total, simulation) => total + simulation.results.length, 0),
  }));
}

export async function getSubjectOptions(userId: string): Promise<SubjectOption[]> {
  const subjects = await prisma.subject.findMany({
    where: { userId },
    select: { id: true, title: true, modules: moduleListSelect },
    orderBy: { title: "asc" },
  });

  return subjects.map((subject) => ({
    ...subject,
    modules: [...subject.modules].sort((left, right) => compareTitles(left.title, right.title)),
  }));
}

/** Detalhe da matéria para a área de estudo (conteúdo completo; somente do dono). */
export async function getSubjectDetail(userId: string, subjectId: string): Promise<SubjectDetailSnapshot> {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    include: {
      modules: moduleListSelect,
      contents: { orderBy: { createdAt: "desc" }, include: contentRelationsInclude },
      simulations: simulationsWithOwnResults(userId),
      importedFrom: { select: { visibility: true, user: { select: { isActive: true } } } },
      _count: { select: { imports: true } },
    },
  });

  if (!subject) {
    throw new DomainError("NOT_FOUND", "Matéria não encontrada.");
  }

  return {
    id: subject.id,
    title: subject.title,
    description: subject.description,
    visibility: subject.visibility,
    publishedAt: subject.publishedAt?.toISOString() ?? null,
    importCount: subject._count.imports,
    importedFrom: subject.isImported
      ? {
          originalId: subject.importedFromId,
          // O link do original só é oferecido enquanto ele continuar público.
          originalAvailable: subject.importedFrom?.visibility === "PUBLIC" && subject.importedFrom.user.isActive,
          title: subject.importedFromTitle ?? subject.title,
          authorId: subject.importedFromOwnerId,
          authorName: subject.importedFromAuthorName ?? "Autor desconhecido",
          importedAt: (subject.importedAt ?? subject.createdAt).toISOString(),
        }
      : null,
    instructor: subject.instructor,
    workloadHours: subject.workloadHours,
    status: subject.status,
    progress: subject.progress,
    difficulty: subject.difficulty,
    finalScore: calculateFinalScore(latestNormalizedScores(subject.simulations)),
    modules: buildModuleSnapshots(subject.modules, subject.contents, ownResults(subject.simulations)),
    contents: subject.contents.map(mapContentDetail),
    history: mapHistory(subject.simulations),
  };
}

/** Matérias para a central de simulados (sem corpo das aulas nem gabaritos). */
export async function getSimulationSubjects(userId: string): Promise<SimulationSubjectSnapshot[]> {
  const subjects = await prisma.subject.findMany({
    where: { userId },
    include: {
      modules: moduleListSelect,
      contents: { orderBy: { createdAt: "desc" }, select: contentSummarySelect },
      simulations: simulationsWithOwnResults(userId),
    },
    orderBy: { title: "asc" },
  });

  return subjects.map((subject) => ({
    id: subject.id,
    title: subject.title,
    status: subject.status,
    finalScore: calculateFinalScore(latestNormalizedScores(subject.simulations)),
    modules: buildModuleSnapshots(subject.modules, subject.contents, ownResults(subject.simulations)),
    contents: subject.contents.map(mapContentSummaryRow),
    availableQuestionCount: countAvailableQuestions(subject.contents),
    history: mapHistory(subject.simulations),
  }));
}

export async function updateSubject(
  userId: string,
  subjectId: string,
  changes: Partial<{ title: string; instructor: string; workloadHours: number; status: SubjectStatus; progress: number }>,
) {
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
  if (!subject) {
    throw new DomainError("NOT_FOUND", "Matéria não encontrada.");
  }

  try {
    await prisma.subject.update({ where: { id: subject.id }, data: changes });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DomainError("CONFLICT", "Você já tem uma matéria com este nome.");
    }
    throw error;
  }
}

export async function deleteSubject(userId: string, subjectId: string) {
  const deleted = await prisma.subject.deleteMany({ where: { id: subjectId, userId } });
  if (deleted.count === 0) {
    throw new DomainError("NOT_FOUND", "Matéria não encontrada.");
  }
}
