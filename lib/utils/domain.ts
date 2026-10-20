import type {
  AiProviderValue,
  ContentClassificationValue,
  ContentProcessingStatusValue,
  SubjectStatusValue,
} from "./types";

export function formatStatusLabel(status: SubjectStatusValue) {
  const labels: Record<SubjectStatusValue, string> = {
    IN_PROGRESS: "Em andamento",
    APPROVED: "Aprovada",
    FAILED: "Reprovada",
  };

  return labels[status];
}

export function getStatusVariant(status: SubjectStatusValue) {
  const variants: Record<SubjectStatusValue, "secondary" | "success" | "danger"> = {
    IN_PROGRESS: "secondary",
    APPROVED: "success",
    FAILED: "danger",
  };

  return variants[status];
}

/** Escala única de notas exibida na interface. */
const SCORE_SCALE = 10;

/** Converte uma nota obtida em um simulado com nota máxima `maxScore` para a escala 0–10. */
export function normalizeScore(score: number, maxScore: number) {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) {
    return 0;
  }
  const normalized = (score / maxScore) * SCORE_SCALE;
  return Number(Math.min(SCORE_SCALE, Math.max(0, normalized)).toFixed(1));
}

/**
 * Nota da matéria: média das notas (já normalizadas 0–10) da tentativa mais recente
 * de cada simulado. Sem tentativas, 0.
 */
export function calculateFinalScore(latestNormalizedScores: number[]) {
  return calculateAverageScore(latestNormalizedScores);
}

export function calculateAverageScore(normalizedScores: number[]) {
  if (normalizedScores.length === 0) {
    return 0;
  }
  const total = normalizedScores.reduce((sum, score) => sum + score, 0);
  return Number((total / normalizedScores.length).toFixed(1));
}

export function formatMinutes(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

/** Ordem natural de nomes ("Módulo 2" antes de "Módulo 10"), sem diferenciar maiúsculas e acentos. */
export function compareTitles(left: string, right: string) {
  return left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" });
}

/** Rótulo das aulas que não estão em nenhum módulo (ficam direto na matéria). */
export const NO_MODULE_LABEL = "Sem módulo";

/** Agrupa as aulas pelos módulos (na ordem recebida) e, por último, as que ficam direto na matéria. */
export function groupContentsByModule<T extends { moduleId: string | null }>(
  modules: Array<{ id: string; title: string }>,
  contents: T[],
) {
  const known = new Set(modules.map((entry) => entry.id));
  const groups = modules.map((entry) => ({
    moduleId: entry.id as string | null,
    title: entry.title,
    contents: contents.filter((content) => content.moduleId === entry.id),
  }));
  groups.push({
    moduleId: null,
    title: NO_MODULE_LABEL,
    contents: contents.filter((content) => !content.moduleId || !known.has(content.moduleId)),
  });
  return groups.filter((group) => group.contents.length > 0);
}

/**
 * Módulo com o menor desempenho, para indicar onde treinar. Só compara módulos que já têm
 * questões respondidas (pelo menos dois) e não aponta nenhum se o menor já estiver com nota máxima.
 */
export function findWeakestModule<T extends { score: number | null }>(modules: T[]) {
  const evaluated = modules.filter((entry): entry is T & { score: number } => entry.score !== null);
  if (evaluated.length < 2) {
    return undefined;
  }
  const weakest = evaluated.reduce((lowest, entry) => (entry.score < lowest.score ? entry : lowest));
  return weakest.score < SCORE_SCALE ? weakest : undefined;
}

/** Variação percentual entre duas notas. Retorna null quando não há base de comparação. */
export function calculateImprovement(previous: number, current: number) {
  if (previous <= 0) {
    return null;
  }

  return Math.round(((current - previous) / previous) * 100);
}

export const aiProviderLabels: Record<AiProviderValue, string> = {
  ANTHROPIC: "Anthropic Claude",
  OPENAI: "OpenAI ChatGPT",
  GEMINI: "Google Gemini",
};

const processingStatusLabels: Record<ContentProcessingStatusValue, string> = {
  PROCESSING: "Processando…",
  COMPLETED: "Conteúdo didático identificado",
  NO_QUESTIONS_NEEDED: "Aula introdutória: geração de questões não necessária",
  NEEDS_REVIEW: "Conteúdo insuficiente: revisão recomendada",
  FAILED: "Erro no processamento: tente novamente",
};

export const processingStatusVariants: Record<
  ContentProcessingStatusValue,
  "secondary" | "success" | "warning" | "danger" | "default"
> = {
  PROCESSING: "default",
  COMPLETED: "success",
  NO_QUESTIONS_NEEDED: "secondary",
  NEEDS_REVIEW: "warning",
  FAILED: "danger",
};

/** Descrição de status que considera a categoria (introdutória × administrativa). */
export function describeProcessingStatus(
  status: ContentProcessingStatusValue,
  classification: ContentClassificationValue | null,
) {
  if (status === "NO_QUESTIONS_NEEDED" && classification === "ADMINISTRATIVE") {
    return "Aula administrativa: geração de questões não necessária";
  }
  return processingStatusLabels[status];
}
