import type { GradePoint } from "@/lib/utils";

interface GradeTrendChartProps {
  data: GradePoint[];
}

const WIDTH = 540;
const HEIGHT = 200;
const MAX_SCORE = 10;
const GRID = [0, 2, 4, 6, 8, 10];

function shortLabel(label: string) {
  return label.length > 12 ? `${label.slice(0, 11)}…` : label;
}

export function GradeTrendChart({ data }: GradeTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-2xl border border-dashed border-border/40 p-4 text-center text-sm text-muted-foreground">
        Nenhum simulado concluído ainda.
      </div>
    );
  }

  const yFor = (score: number) => HEIGHT - 40 - (score / MAX_SCORE) * (HEIGHT - 70);
  const points = data.map((point, index) => ({
    ...point,
    key: `${point.submittedAt}-${index}`,
    x: (index / Math.max(data.length - 1, 1)) * (WIDTH - 80) + 40,
    y: yFor(point.score),
  }));

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${points[0]!.x},${HEIGHT - 40} ${polyline} ${points.at(-1)!.x},${HEIGHT - 40}`;
  const description = points.map((point) => `${point.label}: ${point.score.toFixed(1)}`).join("; ");

  return (
    <figure className="rounded-2xl border border-border/40 bg-secondary/10 p-3 sm:p-5">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={`Notas dos últimos simulados (0 a 10): ${description}`}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {GRID.map((step) => (
          <g key={step}>
            <line x1="40" x2={WIDTH - 40} y1={yFor(step)} y2={yFor(step)} stroke="currentColor" strokeDasharray="4 8" opacity="0.1" />
            <text x="12" y={yFor(step) + 4} fill="currentColor" opacity="0.5" className="text-[11px]">
              {step}
            </text>
          </g>
        ))}

        <polygon fill="url(#areaGradient)" points={area} />
        <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={polyline} />

        {points.map((point) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="5" fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth="2" />
            <text x={point.x} y={HEIGHT - 8} textAnchor="middle" fill="currentColor" opacity="0.6" className="text-[10px]">
              {shortLabel(point.label)}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
