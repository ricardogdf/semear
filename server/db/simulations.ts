import type { Prisma } from "@prisma/client";

import {
  compareTitles,
  type SimulationModuleBreakdown,
  type SimulationSnapshot,
  type SimulationSubmissionResult,
} from "@/lib/utils";

import { prisma } from "./client";
import { DomainError } from "./errors";
import { mapSimulationResult, toQuestionArray, toSimulationQuestions, type StoredSimulationQuestion } from "./mappers";

const MAX_SIMULATION_QUESTIONS = 30;
const MINUTES_PER_QUESTION = 2;
/** Tolerância para latência de rede no envio automático ao fim do tempo. */
const SUBMISSION_GRACE_MS = 2 * 60 * 1000;
const SIMULATION_MAX_SCORE = 10;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap]!, copy[index]!];
  }
  return copy;
}

function deadlineOf(simulation: { createdAt: Date; timeLimitMinutes: number }) {
  return new Date(simulation.createdAt.getTime() + simulation.timeLimitMinutes * 60 * 1000);
}

/** O gabarito e a aula de origem das questões nunca saem do servidor durante o simulado. */
function toPublicSimulation(simulation: {
  id: string;
  title: string;
  timeLimitMinutes: number;
  maxScore: Prisma.Decimal;
  createdAt: Date;
  moduleId: string | null;
  moduleTitle: string | null;
  questions: Prisma.JsonValue;
}): SimulationSnapshot {
  return {
    id: simulation.id,
    title: simulation.title,
    timeLimitMinutes: simulation.timeLimitMinutes,
    maxScore: Number(simulation.maxScore),
    createdAt: simulation.createdAt.toISOString(),
    deadline: deadlineOf(simulation).toISOString(),
    moduleId: simulation.moduleId,
    moduleTitle: simulation.moduleTitle,
    questions: toQuestionArray(simulation.questions).map(({ question, options }) => ({ question, options })),
  };
}

/**
 * Sorteia até 30 questões das aulas com conteúdo didático processado da matéria do usuário.
 * Com `moduleId`, sorteia só das aulas daquele módulo, para treinar um assunto específico.
 */
export async function generateDynamicSimulation(userId: string, subjectId: string, moduleId?: string | null) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    select: {
      id: true,
      contents: { select: { id: true, moduleId: true, trainingQuestions: true, processingStatus: true } },
    },
  });

  if (!subject) {
    throw new DomainError("NOT_FOUND", "Matéria não encontrada.");
  }

  const scope = moduleId
    ? await prisma.subjectModule.findFirst({
        where: { id: moduleId, subjectId: subject.id },
        select: { id: true, title: true },
      })
    : null;
  if (moduleId && !scope) {
    throw new DomainError("NOT_FOUND", "Módulo não encontrado nesta matéria.");
  }

  const pool: StoredSimulationQuestion[] = subject.contents
    .filter((content) => content.processingStatus === "COMPLETED" && (!scope || content.moduleId === scope.id))
    .flatMap((content) =>
      toQuestionArray(content.trainingQuestions).map((question) => ({ ...question, contentId: content.id })),
    );

  if (pool.length === 0) {
    throw new DomainError(
      "PRECONDITION_FAILED",
      scope
        ? "Este módulo ainda não tem questões. Envie ou mova para ele ao menos uma aula com conteúdo didático processado."
        : "Esta matéria ainda não tem questões. Envie ao menos uma aula com conteúdo didático processado.",
    );
  }

  const selected = shuffle(pool)
    .slice(0, MAX_SIMULATION_QUESTIONS)
    .map((question) => ({ ...question, options: shuffle(question.options) }));

  const simulation = await prisma.simulation.create({
    data: {
      title: scope
        ? `Simulado de ${scope.title} (${selected.length} questões)`
        : `Simulado (${selected.length} questões)`,
      timeLimitMinutes: selected.length * MINUTES_PER_QUESTION,
      questions: selected as unknown as Prisma.InputJsonValue,
      maxScore: SIMULATION_MAX_SCORE,
      subjectId: subject.id,
      moduleId: scope?.id ?? null,
      moduleTitle: scope?.title ?? null,
    },
  });

  return toPublicSimulation(simulation);
}

/**
 * Corrige o simulado no servidor. Regras: o simulado pertence ao usuário, aceita uma única
 * tentativa e precisa ser enviado dentro do prazo (com tolerância de rede).
 */
export async function submitSimulationResult(
  userId: string,
  simulationId: string,
  answers: Array<{ questionIndex: number; answer: string | null }>,
): Promise<SimulationSubmissionResult> {
  const simulation = await prisma.simulation.findFirst({
    where: { id: simulationId, subject: { userId } },
    include: { results: { where: { userId }, select: { id: true } }, module: { select: { title: true } } },
  });

  if (!simulation) {
    throw new DomainError("NOT_FOUND", "Simulado não encontrado.");
  }
  if (simulation.results.length > 0) {
    throw new DomainError("CONFLICT", "Este simulado já foi enviado. Gere um novo simulado para tentar novamente.");
  }
  if (Date.now() > deadlineOf(simulation).getTime() + SUBMISSION_GRACE_MS) {
    throw new DomainError("CONFLICT", "O prazo deste simulado expirou. Gere um novo simulado.");
  }

  const questions = toSimulationQuestions(simulation.questions);
  if (questions.length === 0) {
    throw new DomainError("PRECONDITION_FAILED", "Simulado sem questões.");
  }

  const answerByIndex = new Map<number, string | null>();
  for (const entry of answers) {
    if (entry.questionIndex < questions.length) {
      answerByIndex.set(entry.questionIndex, entry.answer);
    }
  }

  // Aula de origem de cada questão, com o módulo ATUAL dela (aulas já excluídas ficam sem origem).
  const originIds = [...new Set(questions.flatMap((question) => (question.contentId ? [question.contentId] : [])))];
  const origins = new Map(
    (
      await prisma.content.findMany({
        where: { id: { in: originIds }, subjectId: simulation.subjectId },
        select: { id: true, moduleId: true, module: { select: { title: true } } },
      })
    ).map((content) => [content.id, content]),
  );

  const contentStats = new Map<string, { contentId: string; correct: number; total: number }>();
  const moduleGroups = new Map<string | null, SimulationModuleBreakdown>();

  const breakdown = questions.map((question, index) => {
    const userAnswer = answerByIndex.get(index) ?? null;
    const isCorrect = userAnswer !== null && userAnswer === question.answer;
    const origin = question.contentId ? origins.get(question.contentId) : undefined;

    if (origin) {
      const stat = contentStats.get(origin.id) ?? { contentId: origin.id, correct: 0, total: 0 };
      const group = moduleGroups.get(origin.moduleId) ?? {
        moduleId: origin.moduleId,
        moduleTitle: origin.module?.title ?? null,
        correct: 0,
        total: 0,
      };
      for (const counter of [stat, group]) {
        counter.total += 1;
        if (isCorrect) counter.correct += 1;
      }
      contentStats.set(origin.id, stat);
      moduleGroups.set(origin.moduleId, group);
    }

    return {
      question: question.question,
      options: question.options,
      userAnswer,
      correctAnswer: question.answer,
      isCorrect,
      moduleTitle: origin?.module?.title ?? null,
    };
  });

  const correctAnswers = breakdown.filter((item) => item.isCorrect).length;
  const maxScore = Number(simulation.maxScore);
  const score = Number(((correctAnswers / questions.length) * maxScore).toFixed(2));

  const result = await prisma.simulationResult.create({
    data: {
      score,
      correctAnswers,
      totalQuestions: questions.length,
      answers: breakdown.map((item, index) => ({ questionIndex: index, answer: item.userAnswer })),
      contentStats: [...contentStats.values()],
      userId,
      subjectId: simulation.subjectId,
      simulationId: simulation.id,
    },
  });

  // Módulos em ordem de nome; as aulas sem módulo por último.
  const moduleBreakdown = [...moduleGroups.values()].sort((left, right) =>
    left.moduleTitle === null ? 1 : right.moduleTitle === null ? -1 : compareTitles(left.moduleTitle, right.moduleTitle),
  );

  return { ...mapSimulationResult(result, simulation), breakdown, moduleBreakdown };
}
