"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, Layers, LayoutList, LoaderCircle, Play, Trophy } from "lucide-react";

import { Alert, Badge, Button } from "@/components/ui";
import {
  cn,
  findWeakestModule,
  formatSimulationScope,
  formatStatusLabel,
  getStatusVariant,
  groupContentsByModule,
  type SimulationSubjectSnapshot,
} from "@/lib/utils";

import { ProcessingStatusBadge } from "@/components/ai/processing-status";
import { ModulePerformance } from "@/components/subjects/module-performance";
import { generateSimulation, getSimulations } from "@/lib/api";
import { clearActiveSimulation, loadActiveSimulation, type ActiveSimulation } from "@/lib/simulation-storage";

import { SimulationAttemptForm } from "./simulation-attempt-form";

/** Opção de conteúdo do simulado: o cartão inteiro seleciona o rádio (rótulo esticado). */
function ScopeOption({
  id,
  checked,
  disabled,
  onSelect,
  label,
  detail,
  badge,
  children,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  label: string;
  detail: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        checked ? "border-primary/50 bg-primary/5" : "border-border/50 hover:bg-secondary/30",
        disabled && "opacity-60 hover:bg-transparent",
      )}
    >
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="radio"
          name="simulation-scope"
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          checked={checked}
          disabled={disabled}
          onChange={onSelect}
          aria-describedby={`${id}-detail`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={id}
              className={cn(
                "break-words text-sm font-medium after:absolute after:inset-0 after:rounded-2xl after:content-['']",
                disabled ? "cursor-not-allowed" : "cursor-pointer",
              )}
            >
              {label}
            </label>
            {badge}
          </div>
          <p id={`${id}-detail`} className="mt-0.5 text-xs text-muted-foreground">
            {detail}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

function SubjectDetail({
  subject,
  initialModuleId,
  onBack,
  onStart,
  resumable,
}: {
  subject: SimulationSubjectSnapshot;
  /** Módulo já escolhido ao abrir (atalho da área de estudo ou do resultado de um simulado). */
  initialModuleId: string | null;
  onBack: () => void;
  onStart: (active: ActiveSimulation) => void;
  resumable: ActiveSimulation | null;
}) {
  const initialModule = subject.modules.find(
    (entry) => entry.id === initialModuleId && entry.availableQuestionCount > 0,
  );
  const [scopeId, setScopeId] = React.useState<string | null>(initialModule?.id ?? null);
  const startButtonRef = React.useRef<HTMLButtonElement>(null);
  const scope = subject.modules.find((entry) => entry.id === scopeId) ?? null;
  const availableQuestions = scope ? scope.availableQuestionCount : subject.availableQuestionCount;
  const weakest = findWeakestModule(subject.modules);
  const groups = groupContentsByModule(subject.modules, subject.contents);

  React.useEffect(() => {
    // Ao chegar com um módulo escolhido, leva direto ao botão de iniciar.
    if (initialModule) {
      startButtonRef.current?.focus({ preventScroll: true });
      startButtonRef.current?.scrollIntoView({ block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useMutation({
    mutationFn: () => generateSimulation(subject.id, scope?.id ?? null),
    onSuccess: (simulation) =>
      onStart({ subjectId: subject.id, subjectTitle: subject.title, simulation, answers: {} }),
  });

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Todas as matérias
      </button>

      <header className="flex flex-col gap-4 rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words font-[var(--font-heading)] text-2xl font-semibold tracking-tight">{subject.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={getStatusVariant(subject.status)}>{formatStatusLabel(subject.status)}</Badge>
            <Badge variant="outline">
              <Trophy className="mr-1 h-3.5 w-3.5" aria-hidden /> Nota {subject.finalScore.toFixed(1)}/10
            </Badge>
          </div>
        </div>
        <Link href={`/subjects/${subject.id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Abrir área de estudo
        </Link>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section className="min-w-0 space-y-4 rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6" aria-labelledby="new-sim">
          <h2 id="new-sim" className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden /> Novo simulado
          </h2>
          <p className="text-sm text-muted-foreground">
            Sorteia até 30 questões das aulas com conteúdo didático (2 minutos por questão).
          </p>

          {subject.modules.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium">O que você quer treinar?</legend>
              <ScopeOption
                id="scope-subject"
                checked={scopeId === null}
                onSelect={() => setScopeId(null)}
                label="Matéria completa"
                detail={`Todas as aulas · ${subject.availableQuestionCount} questão(ões)`}
              />
              {subject.modules.map((entry) => (
                <ScopeOption
                  key={entry.id}
                  id={`scope-${entry.id}`}
                  checked={scopeId === entry.id}
                  disabled={entry.availableQuestionCount === 0}
                  onSelect={() => setScopeId(entry.id)}
                  label={entry.title}
                  detail={`Módulo · ${entry.availableQuestionCount} questão(ões)`}
                  badge={
                    weakest?.id === entry.id ? (
                      <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
                        Mais fraco
                      </Badge>
                    ) : null
                  }
                >
                  <ModulePerformance
                    className="mt-2"
                    title={entry.title}
                    score={entry.score}
                    attemptedQuestions={entry.attemptedQuestions}
                  />
                </ScopeOption>
              ))}
            </fieldset>
          ) : (
            <p className="text-xs text-muted-foreground">
              Para treinar só uma parte da matéria, organize as aulas em módulos na{" "}
              <Link href={`/subjects/${subject.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                área de estudo
              </Link>
              .
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            Banco disponível{scope ? ` em ${scope.title}` : ""}: <strong>{availableQuestions}</strong> questão(ões).
          </p>
          {resumable ? (
            <Alert
              tone="info"
              title={`Há um simulado em andamento nesta matéria${resumable.simulation.moduleTitle ? ` (módulo ${resumable.simulation.moduleTitle})` : ""}`}
            >
              <Button size="sm" className="mt-2" onClick={() => onStart(resumable)}>Continuar</Button>
            </Alert>
          ) : null}
          {subject.availableQuestionCount === 0 ? (
            <Alert tone="warning">
              Nenhuma aula desta matéria tem questões. Aulas introdutórias, administrativas ou com conteúdo insuficiente não
              geram questões.
            </Alert>
          ) : null}
          {generate.isError ? <Alert tone="danger">{generate.error.message}</Alert> : null}
          <Button
            ref={startButtonRef}
            className="w-full"
            size="lg"
            disabled={availableQuestions === 0 || generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {generate.isPending ? "Montando…" : "Gerar e iniciar"}
          </Button>

          <h3 className="pt-2 text-sm font-medium text-muted-foreground">Histórico</h3>
          {subject.history.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">Nenhum simulado feito ainda.</p>
          ) : (
            <ul className="grid gap-2">
              {subject.history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-background/50 p-3">
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium">{formatSimulationScope(entry.moduleTitle)}</span>
                    <span className="block text-xs text-muted-foreground">{new Date(entry.submittedAt).toLocaleDateString("pt-BR")}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="font-semibold text-primary">{entry.score.toFixed(1)}/10</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {entry.correctAnswers}/{entry.totalQuestions} acertos
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 space-y-3 rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6" aria-labelledby="lessons">
          <h2 id="lessons" className="text-lg font-semibold">Aulas ({subject.contents.length})</h2>
          {subject.contents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula enviada para esta matéria.</p>
          ) : (
            groups.map((group) => (
              <div key={group.moduleId ?? "sem-modulo"} className="space-y-3">
                {subject.modules.length > 0 ? (
                  <h3 className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 break-words">
                      {group.title} ({group.contents.length})
                    </span>
                  </h3>
                ) : null}
                <ul className="grid gap-3">
                  {group.contents.map((content) => (
                    <li key={content.id} className="rounded-2xl border border-border/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 break-words font-medium">{content.title}</p>
                        <Badge variant="outline" className="text-[10px]">{content.source}</Badge>
                      </div>
                      <ProcessingStatusBadge content={content} className="mt-2 text-[11px]" />
                      {content.shortSummary ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{content.shortSummary}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

export function SimulationsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useQuery({ queryKey: ["simulations"], queryFn: getSimulations });
  const [activeSubjectId, setActiveSubjectId] = React.useState<string | null>(searchParams.get("open"));
  const [preselectedModuleId, setPreselectedModuleId] = React.useState<string | null>(searchParams.get("module"));
  const [attempt, setAttempt] = React.useState<ActiveSimulation | null>(null);
  const [resumable, setResumable] = React.useState<ActiveSimulation | null>(null);

  React.useEffect(() => {
    setResumable(loadActiveSimulation());
  }, [attempt]);

  function selectSubject(id: string | null, moduleId: string | null = null) {
    setActiveSubjectId(id);
    setPreselectedModuleId(moduleId);
    const params = new URLSearchParams();
    if (id) params.set("open", id);
    if (id && moduleId) params.set("module", moduleId);
    const search = params.toString();
    router.replace(search ? `/simulations?${search}` : "/simulations", { scroll: false });
  }

  if (attempt) {
    return (
      <SimulationAttemptForm
        key={attempt.simulation.id}
        active={attempt}
        onExit={() => {
          setAttempt(null);
          void query.refetch();
        }}
        onTrainModule={(moduleId) => {
          setAttempt(null);
          selectSubject(attempt.subjectId, moduleId);
          void query.refetch();
        }}
      />
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center" role="status">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Carregando simulados…</span>
      </div>
    );
  }

  if (query.isError) {
    return <Alert tone="danger" title="Não foi possível carregar os simulados">{query.error.message}</Alert>;
  }

  const subjects = query.data ?? [];
  const activeSubject = subjects.find((subject) => subject.id === activeSubjectId);

  if (activeSubject) {
    return (
      <SubjectDetail
        key={`${activeSubject.id}:${preselectedModuleId ?? ""}`}
        subject={activeSubject}
        initialModuleId={preselectedModuleId}
        onBack={() => selectSubject(null)}
        onStart={setAttempt}
        resumable={resumable?.subjectId === activeSubject.id ? resumable : null}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
          <LayoutList className="h-6 w-6 text-primary" aria-hidden /> Simulados
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha uma matéria para gerar um simulado com as questões das suas aulas, da matéria completa ou de um módulo.
        </p>
      </header>

      {resumable ? (
        <Alert
          tone="info"
          title={`Simulado em andamento: ${resumable.subjectTitle}${resumable.simulation.moduleTitle ? ` · ${resumable.simulation.moduleTitle}` : ""}`}
        >
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setAttempt(resumable)}>Continuar</Button>
            <Button size="sm" variant="ghost" onClick={() => { clearActiveSimulation(); setResumable(null); }}>Descartar</Button>
          </div>
        </Alert>
      ) : null}

      {subjects.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Nenhuma matéria encontrada. Envie uma aula pelo Dashboard para começar.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <button
                type="button"
                onClick={() => selectSubject(subject.id)}
                className="flex h-full w-full flex-col gap-3 rounded-3xl border border-border/40 bg-card p-5 text-left transition hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold">{subject.title}</span>
                  <Badge variant={getStatusVariant(subject.status)} className="shrink-0 text-[10px]">
                    {formatStatusLabel(subject.status)}
                  </Badge>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Aulas</dt>
                    <dd className="font-semibold">{subject.contents.length}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Questões</dt>
                    <dd className="font-semibold">{subject.availableQuestionCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Nota</dt>
                    <dd className="font-semibold">{subject.finalScore.toFixed(1)}/10</dd>
                  </div>
                </dl>
                {subject.modules.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" aria-hidden /> {subject.modules.length} módulo(s)
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
