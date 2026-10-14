import { AlertTriangle, CheckCircle2, CircleSlash, LoaderCircle, XCircle } from "lucide-react";

import { Badge } from "@/components/ui";
import {
  aiProviderLabels,
  cn,
  describeProcessingStatus,
  processingStatusVariants,
  type ContentSummarySnapshot,
} from "@/lib/utils";

const icons = {
  PROCESSING: LoaderCircle,
  COMPLETED: CheckCircle2,
  NO_QUESTIONS_NEEDED: CircleSlash,
  NEEDS_REVIEW: AlertTriangle,
  FAILED: XCircle,
} as const;

type StatusSource = Pick<
  ContentSummarySnapshot,
  "processingStatus" | "classification" | "classificationReason" | "errorMessage" | "aiProvider" | "aiModel" | "inputTruncated" | "questionCount"
>;

export function ProcessingStatusBadge({ content, className }: { content: StatusSource; className?: string }) {
  const Icon = icons[content.processingStatus];
  return (
    <Badge variant={processingStatusVariants[content.processingStatus]} className={cn("gap-1.5", className)}>
      <Icon className={cn("h-3.5 w-3.5 shrink-0", content.processingStatus === "PROCESSING" && "animate-spin")} aria-hidden />
      <span>{describeProcessingStatus(content.processingStatus, content.classification)}</span>
    </Badge>
  );
}

/** Explicação completa do resultado do processamento (motivo, erro, provedor/modelo usados). */
export function ProcessingDetails({ content }: { content: StatusSource }) {
  const tone =
    content.processingStatus === "FAILED"
      ? "border-danger/30 bg-danger/5"
      : content.processingStatus === "NEEDS_REVIEW"
        ? "border-warning/40 bg-warning/10"
        : "border-border/60 bg-secondary/30";

  return (
    <div className={cn("rounded-2xl border p-4 text-sm", tone)} role={content.processingStatus === "FAILED" ? "alert" : undefined}>
      <ProcessingStatusBadge content={content} />
      {content.processingStatus === "FAILED" && content.errorMessage ? (
        <p className="mt-2 leading-relaxed">{content.errorMessage}</p>
      ) : content.classificationReason ? (
        <p className="mt-2 leading-relaxed text-muted-foreground">{content.classificationReason}</p>
      ) : null}
      {content.processingStatus === "COMPLETED" ? (
        <p className="mt-1 text-muted-foreground">{content.questionCount} questão(ões) fundamentada(s) no texto.</p>
      ) : null}
      {content.inputTruncated ? (
        <p className="mt-2 text-xs text-muted-foreground">
          O texto é muito longo: apenas a primeira parte (150 mil caracteres) foi analisada pela IA.
        </p>
      ) : null}
      {content.aiProvider ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Processado com {aiProviderLabels[content.aiProvider]} · <span className="font-mono">{content.aiModel}</span>
        </p>
      ) : null}
    </div>
  );
}
