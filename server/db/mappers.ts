import type { Content, Prisma, Simulation, SimulationResult, Subject, SubjectModule } from "@prisma/client";

import {
  normalizeScore,
  type AuthorSnapshot,
  type ContentDetailSnapshot,
  type Page,
  type ContentSummarySnapshot,
  type Question,
  type SimulationResultSnapshot,
} from "@/lib/utils";

function parseQuestion(entry: Prisma.JsonValue): Question | null {
  if (
    entry &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    typeof entry.question === "string" &&
    Array.isArray(entry.options) &&
    entry.options.every((option) => typeof option === "string") &&
    typeof entry.answer === "string"
  ) {
    return {
      question: entry.question,
      options: entry.options as string[],
      answer: entry.answer,
      ...(typeof entry.sourceExcerpt === "string" ? { sourceExcerpt: entry.sourceExcerpt } : {}),
    };
  }

  return null;
}

export function toQuestionArray(value: Prisma.JsonValue): Question[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const question = parseQuestion(entry);
    return question ? [question] : [];
  });
}

/** Questão gravada em um simulado, com a aula de onde foi sorteada (uso interno do servidor). */
export interface StoredSimulationQuestion extends Question {
  /** null em simulados criados antes dos módulos, que não guardavam a origem. */
  contentId: string | null;
}

/** Mesmo filtro de `toQuestionArray`: os índices das questões continuam alinhados às respostas. */
export function toSimulationQuestions(value: Prisma.JsonValue): StoredSimulationQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const question = parseQuestion(entry);
    if (!question) {
      return [];
    }
    const origin = entry && typeof entry === "object" && !Array.isArray(entry) ? entry.contentId : null;
    return [{ ...question, contentId: typeof origin === "string" ? origin : null }];
  });
}

/** Acertos de uma tentativa nas questões de uma aula (`SimulationResult.contentStats`). */
export interface ContentStat {
  contentId: string;
  correct: number;
  total: number;
}

export function toContentStats(value: Prisma.JsonValue): ContentStat[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) =>
    entry &&
    typeof entry === "object" &&
    !Array.isArray(entry) &&
    typeof entry.contentId === "string" &&
    typeof entry.correct === "number" &&
    typeof entry.total === "number"
      ? [{ contentId: entry.contentId, correct: entry.correct, total: entry.total }]
      : [],
  );
}

function toStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

type SimulationScope = Pick<Simulation, "maxScore" | "moduleId" | "moduleTitle"> & {
  module?: Pick<SubjectModule, "title"> | null;
};

export function mapSimulationResult(result: SimulationResult, simulation: SimulationScope): SimulationResultSnapshot {
  return {
    id: result.id,
    simulationId: result.simulationId,
    score: normalizeScore(Number(result.score), Number(simulation.maxScore)),
    submittedAt: result.submittedAt.toISOString(),
    correctAnswers: result.correctAnswers,
    totalQuestions: result.totalQuestions,
    moduleId: simulation.moduleId,
    // Nome atual do módulo; se ele foi excluído, o nome guardado quando o simulado foi criado.
    moduleTitle: simulation.module?.title ?? simulation.moduleTitle,
  };
}

/** Relações necessárias para mapear uma aula (matéria e módulo). */
export const contentRelationsInclude = {
  subject: { select: { id: true, title: true } },
  module: { select: { title: true } },
} satisfies Prisma.ContentInclude;

type ContentWithRelations = Content & {
  subject: Pick<Subject, "id" | "title">;
  module: Pick<SubjectModule, "title"> | null;
};

function mapContentSummary(content: ContentWithRelations): ContentSummarySnapshot {
  return {
    id: content.id,
    title: content.title,
    subjectId: content.subject.id,
    subjectTitle: content.subject.title,
    moduleId: content.moduleId,
    moduleTitle: content.module?.title ?? null,
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
    completedAt: content.completedAt?.toISOString() ?? null,
  };
}

export function mapContentDetail(content: ContentWithRelations): ContentDetailSnapshot {
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
  completedAt: true,
  moduleId: true,
  subject: { select: { id: true, title: true } },
  module: { select: { title: true } },
} satisfies Prisma.ContentSelect;

type ContentSummaryRow = Prisma.ContentGetPayload<{ select: typeof contentSummarySelect }>;

export function mapContentSummaryRow(content: ContentSummaryRow): ContentSummarySnapshot {
  return mapContentSummary(content as unknown as ContentWithRelations);
}

// ---------- Comunidade ----------

/** Únicos campos de um usuário que podem aparecer em páginas públicas (nunca e-mail ou papel). */
export const authorSelect = {
  id: true,
  name: true,
  displayName: true,
  avatarUrl: true,
  institution: true,
  course: true,
} satisfies Prisma.UserSelect;

type AuthorRow = Prisma.UserGetPayload<{ select: typeof authorSelect }>;

/** Nome mostrado publicamente: o nome de exibição escolhido ou, sem ele, o nome da conta. */
export function publicName(user: { name: string; displayName: string | null }) {
  return user.displayName?.trim() || user.name;
}

export function mapAuthor(user: AuthorRow): AuthorSnapshot {
  return {
    id: user.id,
    displayName: publicName(user),
    avatarUrl: user.avatarUrl,
    institution: user.institution,
    course: user.course,
  };
}

export const PAGE_SIZE = 12;

/** Busca um item a mais que o tamanho da página para saber se há próxima página. */
export function pageWindow(page: number, pageSize = PAGE_SIZE) {
  return { skip: (page - 1) * pageSize, take: pageSize + 1 };
}

export function toPage<T>(rows: T[], page: number, pageSize = PAGE_SIZE): Page<T> {
  return { items: rows.slice(0, pageSize), page, pageSize, hasMore: rows.length > pageSize };
}
