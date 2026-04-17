import type { GradePoint } from "@semear/utils";

interface GradeTrendChartProps {
  data: GradePoint[];
}

export function GradeTrendChart({ data }: GradeTrendChartProps) {
  const width = 540;
  const height = 200;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] rounded-2xl border border-dashed border-border/40 text-sm text-muted-foreground">
        Nenhum dado de evolução disponível ainda.
      </div>
    );
  }

  const maxScore = Math.max(...data.map(d => d.score), 5);
  
  const points = data.map((point, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * (width - 80) + 40;
    const y = height - 40 - (point.score / maxScore) * (height - 70);
    return { x, y, ...point };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");

  // Create smooth gradient area
  const areaPoints = `${points[0]!.x},${height - 40} ${polylinePoints} ${points[points.length - 1]!.x},${height - 40}`;

  return (
    <div className="rounded-2xl border border-border/40 bg-secondary/10 p-5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Gráfico de evolução de notas"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 1, 2, 3, 4, 5].map((step) => {
          const y = height - 40 - (step / maxScore) * (height - 70);
          return (
            <g key={step}>
              <line
                x1="40"
                x2={width - 40}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeDasharray="4 8"
                opacity="0.1"
              />
              <text
                x="12"
                y={y + 4}
                fill="currentColor"
                opacity="0.4"
                className="text-[11px]"
              >
                {step}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <polygon
          fill="url(#areaGradient)"
          points={areaPoints}
        />

        {/* Line */}
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Data points */}
        {points.map((point, index) => (
          <g key={point.label}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="hsl(var(--primary))"
              stroke="hsl(var(--card))"
              strokeWidth="2"
            />
            <text
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              fill="currentColor"
              opacity="0.5"
              className="text-[10px]"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
