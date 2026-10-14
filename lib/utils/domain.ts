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
