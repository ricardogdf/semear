import { cn } from "@/lib/utils";

/** Desempenho (0–10) de um módulo nas questões já respondidas em simulados. */
export function ModulePerformance({
  title,
  score,
  attemptedQuestions,
  className,
}: {
  title: string;
  score: number | null;
  attemptedQuestions: number;
  className?: string;
}) {
  if (score === null) {
    return <p className={cn("text-xs text-muted-foreground", className)}>Nenhuma questão respondida em simulados ainda.</p>;
  }

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Desempenho em {attemptedQuestions} questão(ões)</span>
        <span className="font-semibold tabular-nums">{score.toFixed(1)}/10</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuetext={`${score.toFixed(1)} de 10`}
        aria-label={`Desempenho em ${title}`}
      >
        <div className={cn("h-full rounded-full", score < 5 ? "bg-warning" : "bg-primary")} style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );
}
