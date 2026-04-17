import type {
  SimulationResultSnapshot,
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
  const variants: Record<
    SubjectStatusValue,
    "secondary" | "success" | "danger"
  > = {
    IN_PROGRESS: "secondary",
    APPROVED: "success",
    FAILED: "danger",
  };

  return variants[status];
}

export function calculateFinalScore(
  results: Array<Pick<SimulationResultSnapshot, "score">>,
) {
  return Number(
    results.reduce((total, result) => total + result.score, 0).toFixed(1),
  );
}

export function calculateAverageScore(
  results: Array<Pick<SimulationResultSnapshot, "score">>,
) {
  if (results.length === 0) {
    return 0;
  }

  return Number(
    (results.reduce((total, result) => total + result.score, 0) / results.length).toFixed(1),
  );
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

export function calculateImprovement(previous: number, current: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
}

export function getUploadSourceLabel(source: "TXT" | "PDF") {
  return source === "PDF" ? "PDF" : "Texto";
}
