"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, LoaderCircle } from "lucide-react";

import {
  Alert,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { formatStatusLabel, getStatusVariant, type SubjectStatusValue } from "@/lib/utils";

import { getSubjects } from "@/lib/api";

const filters: Array<{ value: "all" | SubjectStatusValue; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "IN_PROGRESS", label: "Em andamento" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "FAILED", label: "Reprovadas" },
];

export function SubjectsTable() {
  const [status, setStatus] = useState<"all" | SubjectStatusValue>("all");
  const subjectsQuery = useQuery({
    queryKey: ["subjects", status],
    queryFn: () => getSubjects(status === "all" ? undefined : status),
  });
  const subjects = subjectsQuery.data ?? [];

  const averageProgress = subjects.length
    ? Math.round(subjects.reduce((total, subject) => total + subject.progress, 0) / subjects.length)
    : 0;
  const best = subjects.reduce((max, subject) => Math.max(max, subject.finalScore), 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
          <BookOpen className="h-6 w-6 text-primary" aria-hidden />
          Matérias
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nota da matéria: média das notas mais recentes de cada simulado, na escala de 0 a 10.
        </p>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <TabsList>
            {filters.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value}>
                {filter.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Matérias", value: subjects.length },
          { label: "Progresso médio", value: `${averageProgress}%` },
          { label: "Maior nota", value: `${best.toFixed(1)}/10` },
        ].map((item) => (
          <div key={item.label} className="rounded-3xl border border-border/60 bg-card p-3 sm:p-4">
            <p className="text-xs text-muted-foreground sm:text-sm">{item.label}</p>
            <p className="mt-1 font-[var(--font-heading)] text-xl font-semibold sm:mt-2 sm:text-3xl">{item.value}</p>
          </div>
        ))}
      </div>

      {subjectsQuery.isLoading ? (
        <div className="flex min-h-[160px] items-center justify-center" role="status">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary" aria-hidden />
          <span className="sr-only">Carregando matérias…</span>
        </div>
      ) : subjectsQuery.isError ? (
        <Alert tone="danger" title="Não foi possível carregar as matérias">{subjectsQuery.error.message}</Alert>
      ) : subjects.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Nenhuma matéria encontrada para este filtro. Envie uma aula pelo Dashboard para criar a primeira.
        </p>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {subjects.map((subject) => (
              <li key={subject.subjectId}>
                <Link
                  href={`/subjects/${subject.subjectId}`}
                  className="block rounded-3xl border border-border/60 bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{subject.title}</p>
                    <Badge variant={getStatusVariant(subject.status)} className="shrink-0">
                      {formatStatusLabel(subject.status)}
                    </Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Nota</dt>
                      <dd className="font-semibold">{subject.finalScore.toFixed(1)}/10</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Aulas</dt>
                      <dd className="font-semibold">{subject.contentCount}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Progresso</dt>
                      <dd className="font-semibold">{subject.progress}%</dd>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden rounded-[2rem] border border-border/60 bg-card p-2 md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matéria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Aulas</TableHead>
                  <TableHead>Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.subjectId}>
                    <TableCell>
                      <Link
                        href={`/subjects/${subject.subjectId}`}
                        className="font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {subject.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Média histórica {subject.averageScore.toFixed(1)}/10 · {subject.attemptCount} tentativa(s)
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(subject.status)}>{formatStatusLabel(subject.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <span>{subject.progress}%</span>
                      <div className="mt-2 h-2 w-28 rounded-full bg-secondary" aria-hidden>
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${subject.progress}%` }} />
                      </div>
                    </TableCell>
                    <TableCell>{subject.contentCount}</TableCell>
                    <TableCell>{subject.finalScore.toFixed(1)}/10</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
