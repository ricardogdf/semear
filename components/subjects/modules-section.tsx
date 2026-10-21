"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, Layers, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge, Button } from "@/components/ui";
import { cn, findWeakestModule, type ModuleSnapshot } from "@/lib/utils";

import { DeleteModuleModal, ModuleFormModal } from "./module-dialogs";
import { ModulePerformance } from "./module-performance";

/** Módulos da matéria: desempenho de cada um, atalho para o simulado do módulo e cadastro. */
export function ModulesSection({ subjectId, modules }: { subjectId: string; modules: ModuleSnapshot[] }) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ModuleSnapshot | null>(null);
  const [deleting, setDeleting] = React.useState<ModuleSnapshot | null>(null);
  const weakest = findWeakestModule(modules);

  return (
    <section aria-labelledby="modules-title" className="rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="modules-title" className="flex items-center gap-2 text-lg font-semibold">
            <Layers className="h-5 w-5 text-primary" aria-hidden /> Módulos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opcionais: agrupe as aulas por assunto e faça simulados só de um módulo.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Novo módulo
        </Button>
      </div>

      {modules.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          Nenhum módulo: as aulas ficam direto na matéria. Crie módulos (por exemplo, Multiplicação e Divisão em
          Matemática) para organizar as aulas e treinar cada assunto separadamente.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((entry) => (
            <li
              key={entry.id}
              className={cn(
                "flex min-w-0 flex-col gap-3 rounded-2xl border p-4",
                weakest?.id === entry.id ? "border-warning/50 bg-warning/5" : "border-border/40 bg-background/40",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="break-words font-medium">{entry.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {entry.contentCount} aula(s) · {entry.availableQuestionCount} questão(ões)
                  </p>
                  {entry.contentCount > 0 ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.completedCount === entry.contentCount
                        ? "Todas as aulas concluídas"
                        : `${entry.completedCount} de ${entry.contentCount} aula(s) concluída(s)`}
                    </p>
                  ) : null}
                </div>
                <div className="-mr-2 -mt-1 flex shrink-0">
                  <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Renomear o módulo ${entry.title}`} onClick={() => setEditing(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9" aria-label={`Excluir o módulo ${entry.title}`} onClick={() => setDeleting(entry)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {weakest?.id === entry.id ? (
                <Badge variant="warning" className="self-start">
                  Mais fraco: vale treinar
                </Badge>
              ) : null}
              <ModulePerformance title={entry.title} score={entry.score} attemptedQuestions={entry.attemptedQuestions} />
              {entry.availableQuestionCount > 0 ? (
                <Link
                  href={`/simulations?open=${encodeURIComponent(subjectId)}&module=${encodeURIComponent(entry.id)}`}
                  aria-label={`Fazer simulado do módulo ${entry.title}`}
                  className="mt-auto inline-flex h-9 items-center self-start rounded-full border border-border bg-background px-4 text-xs font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ClipboardList className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Simulado do módulo
                </Link>
              ) : (
                <p className="mt-auto text-xs text-muted-foreground">
                  Sem questões ainda: mova para cá aulas com conteúdo didático.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <ModuleFormModal subjectId={subjectId} open={createOpen} onOpenChange={setCreateOpen} />
      <ModuleFormModal
        subjectId={subjectId}
        editing={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => (open ? undefined : setEditing(null))}
      />
      <DeleteModuleModal subjectId={subjectId} target={deleting} onClose={() => setDeleting(null)} />
    </section>
  );
}
