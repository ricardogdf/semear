import type { Content, Prisma, Simulation, SimulationResult, Subject } from "@prisma/client";

import {
  normalizeScore,
  type ContentDetailSnapshot,
  type ContentSummarySnapshot,
  type Question,
  type SimulationResultSnapshot,
} from "@/lib/utils";

export function toQuestionArray(value: Prisma.JsonValue): Question[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      typeof entry.question === "string" &&
      Array.isArray(entry.options) &&
      entry.options.every((option) => typeof option === "string") &&
      typeof entry.answer === "string"
    ) {
      return [
        {
          question: entry.question,
          options: entry.options as string[],
          answer: entry.answer,
          ...(typeof entry.sourceExcerpt === "string" ? { sourceExcerpt: entry.sourceExcerpt } : {}),
        },
      ];
    }

    return [];
  });
}

function toStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function mapSimulationResult(
  result: SimulationResult,
  simulation: Pick<Simulation, "maxScore">,
): SimulationResultSnapshot {
  return {
    id: result.id,
    simulationId: result.simulationId,
    score: normalizeScore(Number(result.score), Number(simulation.maxScore)),
    submittedAt: result.submittedAt.toISOString(),
    correctAnswers: result.correctAnswers,
    totalQuestions: result.totalQuestions,
  };
}

type ContentWithSubject = Content & { subject: Pick<Subject, "id" | "title"> };

function mapContentSummary(content: ContentWithSubject): ContentSummarySnapshot {
  return {
    id: content.id,
    title: content.title,
    subjectId: content.subject.id,
    subjectTitle: content.subject.title,
    source: content.source,
    createdAt: content.createdAt.toISOString(),
    shortSummary: content.shortSummary,
    processingStatus: content.processingStatus,
    classification: content.classification,
    classificationReason: content.classificationReason,
    questionCount: toQuestionArray(content.trainingQuestions).length,
    aiProvider: content.aiProvider,
    aiModel: content.aiModel,
    processedAt: content.processedAt?.toISOString() ?? null,
    inputTruncated: content.inputTruncated,
    errorMessage: content.errorMessage,
  };
}

export function mapContentDetail(content: ContentWithSubject): ContentDetailSnapshot {
  return {
    ...mapContentSummary(content),
    originalFileName: content.originalFileName,
    body: content.body,
    summary: content.summary,
    importantTopics: content.importantTopics,
    trainingQuestions: toQuestionArray(content.trainingQuestions),
    relevantExcerpts: toStringArray(content.relevantExcerpts),
  };
}

/** Seleção de campos para listagens (sem o corpo do texto, que pode ser grande). */
export const contentSummarySelect = {
  id: true,
  title: true,
  originalFileName: true,
  source: true,
  shortSummary: true,
  processingStatus: true,
  classification: true,
  classificationReason: true,
  trainingQuestions: true,
  aiProvider: true,
  aiModel: true,
  processedAt: true,
  inputTruncated: true,
  errorMessage: true,
  createdAt: true,
  subject: { select: { id: true, title: true } },
} satisfies Prisma.ContentSelect;

type ContentSummaryRow = Prisma.ContentGetPayload<{ select: typeof contentSummarySelect }>;

export function mapContentSummaryRow(content: ContentSummaryRow): ContentSummarySnapshot {
  return mapContentSummary(content as unknown as ContentWithSubject);
}
