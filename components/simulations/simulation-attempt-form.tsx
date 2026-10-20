"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Dumbbell, Flag, LoaderCircle, RotateCcw } from "lucide-react";

import { Alert, Badge, Button, Modal, ModalContent, ModalDescription, ModalTitle } from "@/components/ui";
import {
  cn,
  formatMinutes,
  formatSimulationScope,
  NO_MODULE_LABEL,
  type SimulationModuleBreakdown,
  type SimulationSubmissionResult,
} from "@/lib/utils";

import { submitSimulation } from "@/lib/api";
import { clearActiveSimulation, saveActiveSimulation, type ActiveSimulation } from "@/lib/simulation-storage";

interface SimulationAttemptFormProps {
  active: ActiveSimulation;
  onExit: () => void;
  /** Abre um novo simulado só do módulo escolhido no resultado. */
  onTrainModule?: (moduleId: string) => void;
}

/** Acertos por módulo de um simulado da matéria completa, com atalho para treinar cada módulo. */
function ModuleBreakdown({
  groups,
  onTrainModule,
}: {
  groups: SimulationModuleBreakdown[];
  onTrainModule?: (moduleId: string) => void;
}) {
  return (
    <section className="rounded-[2rem] border border-border/50 bg-card p-5 sm:p-8" aria-labelledby="modules-result-title">
      <h2 id="modules-result-title" className="text-lg font-semibold">Desempenho por módulo</h2>
      <p className="mt-1 text-sm text-muted-foreground">Treine separadamente os módulos em que você mais errou.</p>
      <ul className="mt-5 grid gap-3 md:grid-cols-2">
        {groups.map((group) => {
          const title = group.moduleTitle ?? NO_MODULE_LABEL;
          const percentage = Math.round((group.correct / group.total) * 100);
          return (
            <li key={group.moduleId ?? "sem-modulo"} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 break-words font-medium">{title}</p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  <strong className="text-foreground">{group.correct}</strong> de {group.total} ({percentage}%)
                </p>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Acertos em ${title}`}
              >
                <div className={cn("h-full rounded-full", percentage < 50 ? "bg-warning" : "bg-primary")} style={{ width: `${percentage}%` }} />
              </div>
              {group.moduleId && group.correct < group.total && onTrainModule ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 self-start"
                  aria-label={`Treinar este módulo: ${title}`}
                  onClick={() => onTrainModule(group.moduleId!)}
                >
                  <Dumbbell className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Treinar este módulo
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function secondsUntil(deadline: string) {
  return Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000));
}

export function SimulationAttemptForm({ active, onExit, onTrainModule }: SimulationAttemptFormProps) {
  const { simulation } = active;
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<number, string>>(active.answers);
  const [secondsLeft, setSecondsLeft] = React.useState(() => secondsUntil(simulation.deadline));
  const [result, setResult] = React.useState<SimulationSubmissionResult | null>(null);
  const [confirmExit, setConfirmExit] = React.useState(false);
  const [confirmSubmit, setConfirmSubmit] = React.useState(false);
  const autoSubmitted = React.useRef(false);
  const queryClient = useQueryClient();
  const total = simulation.questions.length;

  const mutation = useMutation({
    mutationFn: () =>
      submitSimulation(
        simulation.id,
        simulation.questions.map((_, position) => ({ questionIndex: position, answer: answers[position] ?? null })),
      ),
    onSuccess: (data) => {
      setResult(data);
      clearActiveSimulation();
      for (const key of ["simulations", "dashboard", "subjects", "subject"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  React.useEffect(() => {
    if (!result) saveActiveSimulation({ ...active, answers });
  }, [active, answers, result]);

  React.useEffect(() => {
    if (result) return;
    const interval = window.setInterval(() => setSecondsLeft(secondsUntil(simulation.deadline)), 1000);
    return () => window.clearInterval(interval);
  }, [result, simulation.deadline]);

  React.useEffect(() => {
    if (secondsLeft === 0 && !result && !mutation.isPending && !autoSubmitted.current) {
      autoSubmitted.current = true;
      mutation.mutate();
    }
  }, [secondsLeft, result, mutation]);

  React.useEffect(() => {
    if (result) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [result]);

  const answeredCount = Object.keys(answers).length;
  const unanswered = total - answeredCount;
  const question = simulation.questions[index];

  if (result) {
    const percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
    // Simulados de um módulo já são de um assunto só; a divisão por módulo vale para a matéria completa.
    const showModules = !simulation.moduleId && result.moduleBreakdown.some((group) => group.moduleId !== null);
    return (
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-border/50 bg-card p-6 text-center sm:p-8" aria-labelledby="result-title">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden />
          </div>
          <h1 id="result-title" className="font-[var(--font-heading)] text-2xl font-semibold sm:text-3xl">Simulado concluído</h1>
          <p className="mt-1 break-words text-muted-foreground">
            {active.subjectTitle} · {formatSimulationScope(simulation.moduleTitle)}
          </p>
          <dl className="mt-6 grid grid-cols-3 gap-3">
            <div>
              <dt className="text-xs text-muted-foreground sm:text-sm">Nota</dt>
              <dd className="font-[var(--font-heading)] text-3xl font-bold tabular-nums sm:text-5xl">{result.score.toFixed(1)}</dd>
              <dd className="text-xs text-muted-foreground">de 10</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground sm:text-sm">Acertos</dt>
              <dd className="font-[var(--font-heading)] text-3xl font-bold tabular-nums sm:text-5xl">{result.correctAnswers}</dd>
              <dd className="text-xs text-muted-foreground">de {result.totalQuestions}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground sm:text-sm">Aproveitamento</dt>
              <dd className="font-[var(--font-heading)] text-3xl font-bold tabular-nums sm:text-5xl">{percentage}%</dd>
            </div>
          </dl>
          <Button variant="outline" className="mt-8" onClick={onExit}>
            Voltar para simulados
          </Button>
        </section>

        {showModules ? <ModuleBreakdown groups={result.moduleBreakdown} onTrainModule={onTrainModule} /> : null}

        <section className="rounded-[2rem] border border-border/50 bg-card p-5 sm:p-8" aria-labelledby="review-title">
          <h2 id="review-title" className="mb-5 text-lg font-semibold">Revisão</h2>
          <ol className="space-y-3">
            {result.breakdown.map((item, position) => (
              <li key={position} className={cn("rounded-2xl border p-4", item.isCorrect ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5")}>
                {showModules && item.moduleTitle ? (
                  <Badge variant="outline" className="mb-2 px-2 py-0.5 text-[10px]">{item.moduleTitle}</Badge>
                ) : null}
                <p className="text-sm font-medium leading-relaxed">
                  <span className="sr-only">{item.isCorrect ? "Correta: " : "Incorreta: "}</span>
                  {position + 1}. {item.question}
                </p>
                {!item.isCorrect ? (
                  <div className="mt-2 space-y-1 text-xs">
                    <p className="text-danger">Sua resposta: {item.userAnswer ?? "não respondida"}</p>
                    <p className="font-medium text-success">Resposta correta: {item.correctAnswer}</p>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  if (!question) {
    return <Alert tone="danger">Simulado sem questões.</Alert>;
  }

  const isLast = index === total - 1;
  const critical = secondsLeft < 60;
  const warning = secondsLeft < 5 * 60;

  return (
    <div className="flex flex-col overflow-hidden rounded-[2rem] border border-border/50 bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-border/40 bg-secondary/10 p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            aria-label="Sair do simulado"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">
              {active.subjectTitle}
              {simulation.moduleTitle ? ` · ${simulation.moduleTitle}` : ""}
            </h1>
            <p className="text-xs text-muted-foreground">
              {answeredCount} de {total} respondidas
            </p>
          </div>
        </div>
        <div
          role="timer"
          aria-label={`Tempo restante ${formatMinutes(secondsLeft)}`}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-2xl border px-3 py-1.5 font-mono text-sm font-semibold",
            critical ? "animate-pulse border-danger/40 bg-danger/10 text-danger" : warning ? "border-warning/40 bg-warning/10" : "border-border/50 bg-background",
          )}
        >
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          {formatMinutes(secondsLeft)}
        </div>
      </header>

      <div className="h-1 w-full bg-secondary" aria-hidden>
        <div className="h-full bg-primary transition-[width]" style={{ width: `${(answeredCount / total) * 100}%` }} />
      </div>

      <nav aria-label="Questões do simulado" className="flex flex-wrap gap-1.5 px-4 pt-4 sm:px-6">
        {simulation.questions.map((_, position) => (
          <button
            key={position}
            type="button"
            onClick={() => setIndex(position)}
            aria-current={position === index ? "step" : undefined}
            aria-label={`Questão ${position + 1}${answers[position] !== undefined ? ", respondida" : ""}`}
            className={cn(
              "h-9 min-w-9 rounded-full px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              position === index
                ? "bg-primary text-primary-foreground"
                : answers[position] !== undefined
                  ? "border border-primary/30 bg-primary/15 text-primary"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary",
            )}
          >
            {position + 1}
          </button>
        ))}
      </nav>

      <section className="mx-auto w-full p-4 sm:p-6 md:max-w-3xl md:p-10" aria-labelledby="question-title">
        <Badge variant="outline" className="text-[10px]">
          Questão {index + 1} de {total}
        </Badge>
        <h2 id="question-title" className="mb-6 mt-3 text-lg font-medium leading-relaxed sm:text-xl md:text-2xl">
          {question.question}
        </h2>
        <div role="radiogroup" aria-labelledby="question-title" className="grid gap-3">
          {question.options.map((option) => {
            const selected = answers[index] === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setAnswers((current) => ({ ...current, [index]: option }))}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-base",
                  selected ? "border-primary bg-primary/5 font-semibold text-primary" : "border-border/50 bg-secondary/20 hover:bg-secondary/50",
                )}
              >
                <span>{option}</span>
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary" : "border-muted-foreground/40")} aria-hidden>
                  {selected ? <span className="h-2 w-2 rounded-full bg-primary-foreground" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {mutation.isError ? (
        <div className="px-4 sm:px-6">
          <Alert tone="danger" title="Não foi possível enviar o simulado">
            {mutation.error.message} Suas respostas continuam salvas neste navegador.
          </Alert>
        </div>
      ) : null}

      <footer className="flex items-center justify-between gap-3 border-t border-border/40 p-4 sm:p-5">
        <Button variant="outline" disabled={index === 0 || mutation.isPending} onClick={() => setIndex((current) => current - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
        </Button>
        {!isLast ? (
          <Button onClick={() => setIndex((current) => current + 1)}>
            Próxima <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            disabled={mutation.isPending}
            onClick={() => (unanswered > 0 ? setConfirmSubmit(true) : mutation.mutate())}
          >
            {mutation.isPending ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : mutation.isError ? (
              <RotateCcw className="mr-2 h-4 w-4" />
            ) : (
              <Flag className="mr-2 h-4 w-4" />
            )}
            {mutation.isError ? "Tentar enviar novamente" : "Finalizar"}
          </Button>
        )}
      </footer>

      <Modal open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <ModalContent>
          <ModalTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" aria-hidden /> Finalizar com {unanswered} sem resposta?
          </ModalTitle>
          <ModalDescription className="mt-2">Questões sem resposta contam como erradas.</ModalDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>Continuar respondendo</Button>
            <Button onClick={() => { setConfirmSubmit(false); mutation.mutate(); }}>Finalizar</Button>
          </div>
        </ModalContent>
      </Modal>

      <Modal open={confirmExit} onOpenChange={setConfirmExit}>
        <ModalContent>
          <ModalTitle>Sair do simulado?</ModalTitle>
          <ModalDescription className="mt-2">
            O tempo continua correndo. Você pode voltar e continuar enquanto o prazo não acabar; depois disso a tentativa
            não poderá mais ser enviada.
          </ModalDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmExit(false)}>Continuar simulado</Button>
            <Button variant="secondary" onClick={onExit}>Sair</Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
