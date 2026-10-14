import type { Prisma } from "@prisma/client";

import {
  type Question,
  type SimulationSnapshot,
  type SimulationSubmissionResult,
} from "@/lib/utils";

import { prisma } from "./client";
import { DomainError } from "./errors";
import { mapSimulationResult, toQuestionArray } from "./mappers";

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

/** O gabarito nunca sai do servidor durante o simulado. */
function toPublicSimulation(simulation: {
  id: string;
  title: string;
  timeLimitMinutes: number;
  maxScore: Prisma.Decimal;
  createdAt: Date;
  questions: Prisma.JsonValue;
}): SimulationSnapshot {
  return {
    id: simulation.id,
    title: simulation.title,
    timeLimitMinutes: simulation.timeLimitMinutes,
    maxScore: Number(simulation.maxScore),
    createdAt: simulation.createdAt.toISOString(),
    deadline: deadlineOf(simulation).toISOString(),
    questions: toQuestionArray(simulation.questions).map(({ question, options }) => ({ question, options })),
  };
}

/** Sorteia até 30 questões das aulas com conteúdo didático processado da matéria do usuário. */
export async function generateDynamicSimulation(userId: string, subjectId: string) {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
    select: { id: true, contents: { select: { trainingQuestions: true, processingStatus: true } } },
  });

  if (!subject) {
    throw new DomainError("NOT_FOUND", "Matéria não encontrada.");
  }

  const pool: Question[] = subject.contents
    .filter((content) => content.processingStatus === "COMPLETED")
    .flatMap((content) => toQuestionArray(content.trainingQuestions));

  if (pool.length === 0) {
    throw new DomainError(
      "PRECONDITION_FAILED",
      "Esta matéria ainda não tem questões. Envie ao menos uma aula com conteúdo didático processado.",
    );
  }

  const selected = shuffle(pool)
    .slice(0, MAX_SIMULATION_QUESTIONS)
    .map((question) => ({ ...question, options: shuffle(question.options) }));

  const simulation = await prisma.simulation.create({
    data: {
      title: `Simulado (${selected.length} questões)`,
      timeLimitMinutes: selected.length * MINUTES_PER_QUESTION,
      questions: selected as unknown as Prisma.InputJsonValue,
      maxScore: SIMULATION_MAX_SCORE,
      subjectId: subject.id,
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
    include: { results: { where: { userId }, select: { id: true } } },
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

  const questions = toQuestionArray(simulation.questions);
  if (questions.length === 0) {
    throw new DomainError("PRECONDITION_FAILED", "Simulado sem questões.");
  }

  const answerByIndex = new Map<number, string | null>();
  for (const entry of answers) {
    if (entry.questionIndex < questions.length) {
      answerByIndex.set(entry.questionIndex, entry.answer);
    }
  }

  const breakdown = questions.map((question, index) => {
    const userAnswer = answerByIndex.get(index) ?? null;
    return {
      question: question.question,
      options: question.options,
      userAnswer,
      correctAnswer: question.answer,
      isCorrect: userAnswer !== null && userAnswer === question.answer,
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
      userId,
      subjectId: simulation.subjectId,
      simulationId: simulation.id,
    },
  });

  return { ...mapSimulationResult(result, simulation), breakdown };
}

