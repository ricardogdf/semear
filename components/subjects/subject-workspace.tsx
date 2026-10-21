"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  BrainCircuit,
  ChevronLeft,
  ClipboardList,
  FileText,
  History,
  Key,
  Layers,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  Alert,
  Badge,
  Button,
  Input,
  Label,
  Modal,
  ModalContent,
  ModalDescription,
  ModalTitle,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  aiProviderLabels,
  cn,
  formatStatusLabel,
  getStatusVariant,
  groupContentsByModule,
  subjectStatusValues,
  type ContentDetailSnapshot,
  type ModuleSnapshot,
  type SubjectDetailSnapshot,
  type SubjectStatusValue,
} from "@/lib/utils";

import { AiModelPicker, type AiSelection } from "@/components/ai/ai-model-picker";
import { ProcessingDetails, ProcessingStatusBadge } from "@/components/ai/processing-status";
import { useToast } from "@/components/providers/toast-provider";
import {
  deleteContent,
  deleteSubject,
  getProcessingRuns,
  getSubjectDetails,
  moveContentToModule,
  reprocessContent,
  updateSubject,
} from "@/lib/api";

import { ContentPractice } from "./content-practice";
import { ModuleFormModal, useRefreshSubject } from "./module-dialogs";
import { ModulesSection } from "./modules-section";
import { SubjectSharing } from "./subject-sharing";

function ProcessingHistory({ contentId }: { contentId: string }) {
  const query = useQuery({ queryKey: ["processing-runs", contentId], queryFn: () => getProcessingRuns(contentId) });
  if (query.isLoading) return <p className="text-sm text-muted-foreground">Carregando histórico…</p>;
  if (query.isError) return <Alert tone="danger">{query.error.message}</Alert>;
  if (!query.data?.length) return <p className="text-sm text-muted-foreground">Sem processamentos registrados.</p>;
  return (
    <ul className="space-y-2 text-sm">
      {query.data.map((run) => (
        <li key={run.id} className="rounded-xl border border-border/50 p-3">
          <p className="font-medium">
            {aiProviderLabels[run.provider]} · <span className="font-mono text-xs">{run.model}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(run.startedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} ·{" "}
            {run.status === "SUCCEEDED" ? `concluído, ${run.questionsGenerated} questão(ões)` : run.status === "FAILED" ? `falhou (${run.errorCode})` : "em andamento"}
          </p>
        </li>
      ))}
    </ul>
  );
}

const NEW_MODULE_OPTION = "__novo__";

/** Escolhe o módulo da aula: um existente, um novo ou nenhum (direto na matéria). */
function ModulePicker({
  content,
  subjectId,
  modules,
}: {
  content: ContentDetailSnapshot;
  subjectId: string;
  modules: ModuleSnapshot[];
}) {
  const queryClient = useQueryClient();
  const refresh = useRefreshSubject(subjectId);
  const { notify } = useToast();
  const [createOpen, setCreateOpen] = React.useState(false);

  const move = useMutation({
    mutationFn: (moduleId: string | null) => moveContentToModule(content.id, moduleId),
    onSuccess: (updated) => {
      queryClient.setQueryData<SubjectDetailSnapshot>(["subject", subjectId], (current) =>
        current
          ? { ...current, contents: current.contents.map((entry) => (entry.id === updated.id ? updated : entry)) }
          : current,
      );
      refresh();
      notify(
        "success",
        updated.moduleTitle ? `Aula movida para o módulo "${updated.moduleTitle}".` : "Aula movida para fora dos módulos.",
      );
    },
    onError: (error) => notify("error", error.message),
  });

  const selectId = `module-${content.id}`;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <Label htmlFor={selectId} className="shrink-0">
        Módulo
      </Label>
      <div className="flex items-center gap-2 sm:w-80">
        <Select
          id={selectId}
          value={content.moduleId ?? ""}
          disabled={move.isPending}
          onChange={(event) => {
            if (event.target.value === NEW_MODULE_OPTION) setCreateOpen(true);
            else move.mutate(event.target.value || null);
          }}
        >
          <option value="">Sem módulo (direto na matéria)</option>
          {modules.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.title}
            </option>
          ))}
          <option value={NEW_MODULE_OPTION}>+ Criar novo módulo…</option>
        </Select>
        {move.isPending ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Movendo a aula" /> : null}
      </div>
      <ModuleFormModal
        subjectId={subjectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        description={`A aula “${content.title}” será movida para o novo módulo.`}
        onSaved={(created) => move.mutate(created.id)}
      />
    </div>
  );
}

function ContentPanel({
  content,
  subjectId,
  modules,
}: {
  content: ContentDetailSnapshot;
  subjectId: string;
  modules: ModuleSnapshot[];
}) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [reprocessOpen, setReprocessOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [selection, setSelection] = React.useState<AiSelection>({
    provider: content.aiProvider ?? "",
    model: content.aiModel ?? "",
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["subject", subjectId] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["simulations"] });
    void queryClient.invalidateQueries({ queryKey: ["processing-runs", content.id] });
  };

  const reprocess = useMutation({
    mutationFn: () =>
      reprocessContent(content.id, {
        provider: selection.provider || undefined,
        model: selection.model || undefined,
      }),
    onSuccess: (result) => {
      setReprocessOpen(false);
      notify(result.processingStatus === "FAILED" ? "error" : "success", result.processingStatus === "FAILED" ? "O reprocessamento falhou." : "Aula reprocessada.");
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteContent(content.id),
    onSuccess: () => {
      setDeleteOpen(false);
      notify("success", "Aula excluída.");
      refresh();
    },
    onError: (error) => notify("error", error.message),
  });

  const hasMaterial = Boolean(content.summary);

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-xl font-semibold">{content.title}</h2>
          <p className="text-xs text-muted-foreground">
            {content.originalFileName} · enviado em {new Date(content.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => { reprocess.reset(); setReprocessOpen(true); }} disabled={content.processingStatus === "PROCESSING"}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reprocessar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen}>
            <History className="mr-1.5 h-3.5 w-3.5" /> Histórico
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
      </div>

      <ModulePicker key={`module-picker-${content.id}`} content={content} subjectId={subjectId} modules={modules} />
      <ProcessingDetails content={content} />
      {historyOpen ? (
        <div className="rounded-2xl border border-border/60 p-4">
          <h3 className="mb-3 text-sm font-semibold">Histórico de processamento</h3>
          <ProcessingHistory contentId={content.id} />
        </div>
      ) : null}

      <Tabs defaultValue={hasMaterial ? "summary" : "raw"} key={content.id}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="summary" disabled={!hasMaterial}>
              <BookOpen className="mr-2 h-4 w-4" aria-hidden /> Resumo
            </TabsTrigger>
            <TabsTrigger value="raw">
              <FileText className="mr-2 h-4 w-4" aria-hidden /> Texto
            </TabsTrigger>
            <TabsTrigger value="topics" disabled={!content.importantTopics}>
              <Key className="mr-2 h-4 w-4" aria-hidden /> Palavras-chave
            </TabsTrigger>
            <TabsTrigger value="questions" disabled={content.trainingQuestions.length === 0}>
              <BrainCircuit className="mr-2 h-4 w-4" aria-hidden /> Questões ({content.trainingQuestions.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary">
          {content.relevantExcerpts.length > 0 ? (
            <details className="mb-5 rounded-2xl border border-border/60 p-4 text-sm">
              <summary className="cursor-pointer font-medium">
                Aula mista: questões geradas a partir de {content.relevantExcerpts.length} trecho(s) didático(s)
              </summary>
              <div className="mt-3 space-y-3">
                {content.relevantExcerpts.map((excerpt, index) => (
                  <p key={index} className="whitespace-pre-wrap rounded-xl bg-secondary/40 p-3 text-muted-foreground">
                    {excerpt}
                  </p>
                ))}
              </div>
            </details>
          ) : null}
          <article className="prose prose-sm max-w-none dark:prose-invert sm:prose-base prose-headings:font-[var(--font-heading)] prose-a:text-primary prose-blockquote:border-primary">
            <ReactMarkdown>{content.summary}</ReactMarkdown>
          </article>
        </TabsContent>

        <TabsContent value="raw">
          <div className="max-h-[70vh] overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-border/40 bg-secondary/10 p-4 text-sm leading-7 text-muted-foreground">
            {content.body}
          </div>
        </TabsContent>

        <TabsContent value="topics">
          <ul className="flex flex-wrap gap-2">
            {content.importantTopics
              .split(",")
              .map((topic) => topic.trim())
              .filter(Boolean)
              .map((topic) => (
                <li key={topic}>
                  <Badge variant="outline" className="px-3 py-1.5 text-sm">
                    {topic}
                  </Badge>
                </li>
              ))}
          </ul>
        </TabsContent>

        <TabsContent value="questions">
          <ContentPractice questions={content.trainingQuestions} />
        </TabsContent>
      </Tabs>

      <Modal open={reprocessOpen} onOpenChange={setReprocessOpen}>
        <ModalContent>
          <ModalTitle>Reprocessar aula</ModalTitle>
          <ModalDescription className="mt-2">
            O texto já salvo será analisado de novo. O material atual é substituído apenas se o novo processamento for concluído.
          </ModalDescription>
          <div className="mt-5">
            <AiModelPicker idPrefix={`reprocess-${content.id}`} value={selection} onChange={setSelection} disabled={reprocess.isPending} />
          </div>
          {reprocess.isError ? <Alert tone="danger" className="mt-4">{reprocess.error.message}</Alert> : null}
          {reprocess.isPending ? <p role="status" className="mt-4 text-sm text-muted-foreground">Processando… isso pode levar alguns minutos.</p> : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setReprocessOpen(false)} disabled={reprocess.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => reprocess.mutate()} disabled={reprocess.isPending || !selection.provider || !selection.model}>
              {reprocess.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Reprocessar
            </Button>
          </div>
        </ModalContent>
      </Modal>

      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent>
          <ModalTitle>Excluir “{content.title}”?</ModalTitle>
          <ModalDescription className="mt-2">
            O texto, o resumo e as questões desta aula serão apagados. Simulados já realizados continuam no histórico.
          </ModalDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => remove.mutate()} disabled={remove.isPending}>
              {remove.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir aula
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}

function EditSubjectModal({
  subject,
  open,
  onOpenChange,
}: {
  subject: SubjectDetailSnapshot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [values, setValues] = React.useState({
    title: subject.title,
    instructor: subject.instructor,
    workloadHours: String(subject.workloadHours),
    status: subject.status,
    progress: String(subject.progress),
  });

  React.useEffect(() => {
    if (open) {
      setValues({
        title: subject.title,
        instructor: subject.instructor,
        workloadHours: String(subject.workloadHours),
        status: subject.status,
        progress: String(subject.progress),
      });
    }
  }, [open, subject]);

  const mutation = useMutation({
    mutationFn: () =>
      updateSubject(subject.id, {
        title: values.title.trim(),
        instructor: values.instructor.trim(),
        workloadHours: Math.max(0, Math.round(Number(values.workloadHours) || 0)),
        status: values.status,
        progress: Math.min(100, Math.max(0, Math.round(Number(values.progress) || 0))),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["subject", subject.id], data);
      void queryClient.invalidateQueries({ queryKey: ["subjects"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onOpenChange(false);
      notify("success", "Matéria atualizada.");
    },
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalTitle>Editar matéria</ModalTitle>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div>
            <Label htmlFor="es-title">Nome</Label>
            <Input id="es-title" className="mt-2" required maxLength={120} value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} />
          </div>
          <div>
            <Label htmlFor="es-instructor">Professor(a)</Label>
            <Input id="es-instructor" className="mt-2" maxLength={120} value={values.instructor} onChange={(event) => setValues({ ...values, instructor: event.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="es-hours">Carga horária (h)</Label>
              <Input id="es-hours" className="mt-2" type="number" inputMode="numeric" min={0} max={2000} value={values.workloadHours} onChange={(event) => setValues({ ...values, workloadHours: event.target.value })} />
            </div>
            <div>
              <Label htmlFor="es-progress">Progresso (%)</Label>
              <Input id="es-progress" className="mt-2" type="number" inputMode="numeric" min={0} max={100} value={values.progress} onChange={(event) => setValues({ ...values, progress: event.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="es-status">Situação</Label>
            <Select id="es-status" className="mt-2" value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as SubjectStatusValue })}>
              {subjectStatusValues.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </Select>
          </div>
          {mutation.isError ? <Alert tone="danger">{mutation.error.message}</Alert> : null}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending || !values.title.trim()}>
              {mutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}

export function SubjectWorkspace({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const query = useQuery({ queryKey: ["subject", subjectId], queryFn: () => getSubjectDetails(subjectId) });
  const [activeContentId, setActiveContentId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const removeSubject = useMutation({
    mutationFn: () => deleteSubject(subjectId),
    onSuccess: () => {
      notify("success", "Matéria excluída.");
      void queryClient.invalidateQueries({ queryKey: ["subjects"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      router.push("/subjects");
    },
    onError: (error) => notify("error", error.message),
  });

  const subject = query.data;
  const groups = subject ? groupContentsByModule(subject.modules, subject.contents) : [];
  const activeContent =
    subject?.contents.find((content) => content.id === activeContentId) ?? groups[0]?.contents[0];

  if (query.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center" role="status">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <span className="sr-only">Carregando matéria…</span>
      </div>
    );
  }

  if (query.isError || !subject) {
    return (
      <div className="space-y-4">
        <Alert tone="danger" title="Não foi possível abrir a matéria">{query.error?.message}</Alert>
        <Link href="/subjects" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Voltar para Matérias
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/subjects" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Matérias
      </Link>

      <header className="flex flex-col gap-4 rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="break-words font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">{subject.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subject.instructor} · {subject.workloadHours}h · progresso {subject.progress}%
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant(subject.status)}>{formatStatusLabel(subject.status)}</Badge>
            <Badge variant="outline">Nota {subject.finalScore.toFixed(1)}/10</Badge>
            {subject.importedFrom ? <Badge variant="secondary">Importada</Badge> : null}
            {subject.visibility === "PUBLIC" ? <Badge variant="success">Pública</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/simulations?open=${subject.id}`}
            className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ClipboardList className="mr-2 h-4 w-4" aria-hidden /> Simulados
          </Link>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Button>
          <Button variant="ghost" onClick={() => setDeleteOpen(true)} aria-label="Excluir matéria">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <SubjectSharing key={`${subject.id}-${subject.visibility}`} subject={subject} />

      <ModulesSection subjectId={subject.id} modules={subject.modules} />

      {subject.contents.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          Nenhuma aula enviada. Use o formulário do{" "}
          <Link href="/dashboard" className="font-medium text-primary underline-offset-4 hover:underline">Dashboard</Link>{" "}
          para enviar a primeira.
        </p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <section aria-labelledby="lessons-title" className="min-w-0 space-y-3">
            <h2 id="lessons-title" className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Aulas ({subject.contents.length})
            </h2>
            {groups.map((group) => (
              <div key={group.moduleId ?? "sem-modulo"} className="space-y-2">
                {subject.modules.length > 0 ? (
                  <h3 className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-muted-foreground">
                    <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="min-w-0 break-words">
                      {group.title} ({group.contents.length})
                    </span>
                  </h3>
                ) : null}
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {group.contents.map((content) => (
                    <li key={content.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveContentId(content.id);
                          if (window.matchMedia("(max-width: 1023px)").matches) {
                            panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        }}
                        aria-current={activeContent?.id === content.id ? "true" : undefined}
                        className={cn(
                          "flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          activeContent?.id === content.id ? "border-primary/50 bg-primary/10" : "border-border/40 bg-card hover:bg-secondary/40",
                        )}
                      >
                        <span className="line-clamp-2 text-sm font-medium">{content.title}</span>
                        <ProcessingStatusBadge content={content} className="self-start text-[11px]" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <div ref={panelRef} className="scroll-mt-20 rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6">
            {activeContent ? <ContentPanel content={activeContent} subjectId={subject.id} modules={subject.modules} /> : null}
          </div>
        </div>
      )}

      <EditSubjectModal subject={subject} open={editOpen} onOpenChange={setEditOpen} />

      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent>
          <ModalTitle>Excluir “{subject.title}”?</ModalTitle>
          <ModalDescription className="mt-2">
            Todas as aulas, simulados e notas desta matéria serão apagados definitivamente.
          </ModalDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => removeSubject.mutate()} disabled={removeSubject.isPending}>
              {removeSubject.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir matéria
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
