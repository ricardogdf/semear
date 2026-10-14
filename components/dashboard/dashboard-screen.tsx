"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CircleOff, LoaderCircle, Sparkles, Target, TrendingUp } from "lucide-react";

import { Alert, Badge } from "@/components/ui";
import { formatStatusLabel, getStatusVariant } from "@/lib/utils";

import { ProcessingStatusBadge } from "@/components/ai/processing-status";
import { getDashboard, getSubjectOptions } from "@/lib/api";

import { UploadForm } from "../upload/upload-form";
import { GradeTrendChart } from "./grade-trend-chart";

const metricCards = [
  { key: "totalSubjects", label: "Matérias", icon: Target },
  { key: "approvedSubjects", label: "Aprovadas", icon: TrendingUp },
  { key: "failedSubjects", label: "Reprovadas", icon: CircleOff },
  { key: "inProgressSubjects", label: "Em andamento", icon: ArrowUpRight },
] as const;

const card = "rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6 md:p-8";

export function DashboardScreen({ userName }: { userName: string }) {
  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
  const subjectOptionsQuery = useQuery({ queryKey: ["subject-options"], queryFn: getSubjectOptions });

  if (dashboardQuery.isLoading || subjectOptionsQuery.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center" role="status">
        <LoaderCircle className="h-6 w-6 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Carregando dashboard…</span>
      </div>
    );
  }

  if (dashboardQuery.isError || subjectOptionsQuery.isError || !dashboardQuery.data || !subjectOptionsQuery.data) {
    return (
      <Alert tone="danger" title="Não foi possível carregar o dashboard">
        {dashboardQuery.error?.message ?? subjectOptionsQuery.error?.message}
      </Alert>
    );
  }

  const dashboard = dashboardQuery.data;
  const firstName = userName.split(" ")[0];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7 xl:col-span-8">
        <section className={card}>
          <p className="text-sm text-muted-foreground">Olá, {firstName}</p>
          <h1 className="mt-1 font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
            Seu painel de estudos
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Envie aulas, revise o material gerado e acompanhe sua evolução nos simulados.
          </p>
        </section>

        <section aria-label="Resumo das matérias" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {metricCards.map((item) => (
            <div key={item.key} className="rounded-3xl border border-border/50 bg-card p-4 sm:p-5">
              <item.icon className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden />
              <p className="font-[var(--font-heading)] text-2xl font-semibold sm:text-3xl">{dashboard.metrics[item.key]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </section>

        <section className={card} aria-labelledby="evolution-title">
          <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
            <div className="min-w-0">
              <h2 id="evolution-title" className="text-lg font-medium">Evolução</h2>
              <p className="mb-4 text-sm text-muted-foreground">Notas (0 a 10) dos últimos simulados.</p>
              <GradeTrendChart data={dashboard.evolution} />
            </div>
            <div>
              <h2 className="text-lg font-medium">Insights</h2>
              <p className="mb-4 text-sm text-muted-foreground">Calculados a partir dos seus resultados.</p>
              <ul className="space-y-3">
                {dashboard.insights.map((insight) => (
                  <li key={insight.id} className="flex items-start gap-3 rounded-2xl border border-border/40 bg-background/50 p-4">
                    <span className="mt-0.5 shrink-0 rounded-full bg-primary/10 p-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="lg:col-span-5 xl:col-span-4">
        <UploadForm subjectOptions={subjectOptionsQuery.data} />
      </div>

      <section className={`${card} lg:col-span-12`} aria-labelledby="recent-title">
        <h2 id="recent-title" className="text-lg font-medium">Aulas recentes</h2>
        <p className="mb-5 text-sm text-muted-foreground">Últimos envios e o resultado da análise.</p>
        {dashboard.recentContents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Nenhuma aula enviada ainda. Use o formulário acima para começar.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboard.recentContents.map((content) => (
              <li key={content.id}>
                <Link
                  href={`/subjects/${content.subjectId}`}
                  className="flex h-full flex-col gap-3 rounded-3xl border border-border/40 bg-secondary/20 p-5 transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div>
                    <p className="line-clamp-2 text-sm font-medium">{content.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{content.subjectTitle}</p>
                  </div>
                  <ProcessingStatusBadge content={content} className="self-start" />
                  {content.shortSummary ? (
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{content.shortSummary}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} lg:col-span-12`} aria-labelledby="subjects-title">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="subjects-title" className="text-lg font-medium">Matérias</h2>
            <p className="text-sm text-muted-foreground">As mais praticadas em simulados.</p>
          </div>
          <Link href="/subjects" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Ver todas
          </Link>
        </div>
        {dashboard.subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma matéria ainda.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboard.subjects.map((subject) => (
              <li key={subject.subjectId}>
                <Link
                  href={`/subjects/${subject.subjectId}`}
                  className="block rounded-3xl border border-border/40 bg-background/40 p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="mb-5 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{subject.title}</p>
                    <Badge variant={getStatusVariant(subject.status)} className="shrink-0 text-[10px]">
                      {formatStatusLabel(subject.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{subject.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={subject.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${subject.title}`}>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${subject.progress}%` }} />
                      </div>
                    </div>
                    <div className="border-l border-border/50 pl-4 text-right">
                      <p className="mb-1 text-[10px] text-muted-foreground">Nota</p>
                      <p className="text-lg font-semibold leading-none">
                        {subject.finalScore.toFixed(1)}
                        <span className="text-xs font-normal text-muted-foreground">/10</span>
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
