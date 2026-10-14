"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ClipboardList, LayoutList, LoaderCircle, Play, Trophy } from "lucide-react";

import { Alert, Badge, Button } from "@/components/ui";
import { formatStatusLabel, getStatusVariant, type SimulationSubjectSnapshot } from "@/lib/utils";

import { ProcessingStatusBadge } from "@/components/ai/processing-status";
import { generateSimulation, getSimulations } from "@/lib/api";
import { clearActiveSimulation, loadActiveSimulation, type ActiveSimulation } from "@/lib/simulation-storage";

import { SimulationAttemptForm } from "./simulation-attempt-form";

function SubjectDetail({
  subject,
  onBack,
  onStart,
  resumable,
}: {
  subject: SimulationSubjectSnapshot;
  onBack: () => void;
  onStart: (active: ActiveSimulation) => void;
  resumable: ActiveSimulation | null;
}) {
  const generate = useMutation({
    mutationFn: () => generateSimulation(subject.id),
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
        <section className="space-y-4 rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6" aria-labelledby="new-sim">
          <h2 id="new-sim" className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden /> Novo simulado
          </h2>
          <p className="text-sm text-muted-foreground">
            Sorteia até 30 questões das aulas com conteúdo didático (2 minutos por questão). Banco disponível:{" "}
            <strong>{subject.availableQuestionCount}</strong> questão(ões).
          </p>
          {resumable ? (
            <Alert tone="info" title="Há um simulado em andamento nesta matéria">
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
          <Button className="w-full" size="lg" disabled={subject.availableQuestionCount === 0 || generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {generate.isPending ? "Montando…" : "Gerar e iniciar"}
          </Button>

          <h3 className="pt-2 text-sm font-medium text-muted-foreground">Histórico</h3>
          {subject.history.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">Nenhum simulado feito ainda.</p>
          ) : (
            <ul className="grid gap-2">
              {subject.history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between rounded-2xl border border-border/40 bg-background/50 p-3">
                  <span className="text-sm text-muted-foreground">{new Date(entry.submittedAt).toLocaleDateString("pt-BR")}</span>
                  <span className="text-right">
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

        <section className="space-y-3 rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6" aria-labelledby="lessons">
          <h2 id="lessons" className="text-lg font-semibold">Aulas ({subject.contents.length})</h2>
          {subject.contents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula enviada para esta matéria.</p>
          ) : (
            <ul className="grid gap-3">
              {subject.contents.map((content) => (
                <li key={content.id} className="rounded-2xl border border-border/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium">{content.title}</p>
                    <Badge variant="outline" className="text-[10px]">{content.source}</Badge>
                  </div>
                  <ProcessingStatusBadge content={content} className="mt-2 text-[11px]" />
                  {content.shortSummary ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{content.shortSummary}</p> : null}
                </li>
              ))}
            </ul>
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
  const [attempt, setAttempt] = React.useState<ActiveSimulation | null>(null);
  const [resumable, setResumable] = React.useState<ActiveSimulation | null>(null);

  React.useEffect(() => {
    setResumable(loadActiveSimulation());
  }, [attempt]);

  function selectSubject(id: string | null) {
    setActiveSubjectId(id);
    router.replace(id ? `/simulations?open=${encodeURIComponent(id)}` : "/simulations", { scroll: false });
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
        subject={activeSubject}
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
        <p className="mt-2 text-sm text-muted-foreground">Escolha uma matéria para gerar um simulado com as questões das suas aulas.</p>
      </header>

      {resumable ? (
        <Alert tone="info" title={`Simulado em andamento: ${resumable.subjectTitle}`}>
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
