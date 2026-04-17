"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@semear/ui";
import { formatStatusLabel, getStatusVariant, type SubjectStatusValue } from "@semear/utils";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestao de materias</CardTitle>
        <CardDescription>
          Acompanhe status, progresso e nota final acumulada pelos dois simulados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={status} onValueChange={(value) => setStatus(value as typeof status)}>
          <TabsList>
            {filters.map((filter) => (
              <TabsTrigger key={filter.value} value={filter.value}>
                {filter.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-border/60 bg-secondary/30 p-4">
            <p className="text-sm text-muted-foreground">Materias visiveis</p>
            <p className="mt-2 font-[var(--font-heading)] text-3xl font-semibold">
              {subjects.length}
            </p>
          </div>
          <div className="rounded-[24px] border border-border/60 bg-secondary/30 p-4">
            <p className="text-sm text-muted-foreground">Media de progresso</p>
            <p className="mt-2 font-[var(--font-heading)] text-3xl font-semibold">
              {subjects.length > 0
                ? Math.round(
                    subjects.reduce((total, subject) => total + subject.progress, 0) /
                      subjects.length,
                  )
                : 0}
              %
            </p>
          </div>
          <div className="rounded-[24px] border border-border/60 bg-secondary/30 p-4">
            <p className="text-sm text-muted-foreground">Maior nota final</p>
            <p className="mt-2 font-[var(--font-heading)] text-3xl font-semibold">
              {subjects.reduce((best, subject) => Math.max(best, subject.finalScore), 0)}/10
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Materia</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Nota final</TableHead>
              <TableHead>Dificuldade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjectsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  Carregando materias...
                </TableCell>
              </TableRow>
            ) : null}

            {subjectsQuery.isError ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-danger">
                  {(subjectsQuery.error as Error).message}
                </TableCell>
              </TableRow>
            ) : null}

            {!subjectsQuery.isLoading && !subjectsQuery.isError && subjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  Nenhuma materia encontrada para esse filtro.
                </TableCell>
              </TableRow>
            ) : null}

            {subjects.map((subject) => (
              <TableRow 
                key={subject.subjectId} 
                className="cursor-pointer transition-colors hover:bg-secondary/40"
                onClick={() => {
                  window.location.href = `/subjects/${subject.subjectId}`;
                }}
              >
                <TableCell>
                  <div>
                    <p className="font-medium">{subject.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Media historica {subject.averageScore}/5
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(subject.status)}>
                    {formatStatusLabel(subject.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <span>{subject.progress}%</span>
                    <div className="h-2 w-28 rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell>{subject.finalScore}/10</TableCell>
                <TableCell>{subject.difficulty}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
