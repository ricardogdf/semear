"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, FileText, LoaderCircle, Plus, Sparkles, UploadCloud } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { Alert, Badge, Button, FieldError, Input, Label } from "@/components/ui";
import { uploadContentSchema, type ContentDetailSnapshot } from "@/lib/utils";

import { AiModelPicker, useAiSettings, type AiSelection } from "@/components/ai/ai-model-picker";
import { ProcessingDetails } from "@/components/ai/processing-status";
import { useToast } from "@/components/providers/toast-provider";
import { uploadContent } from "@/lib/api";

type UploadFormValues = z.infer<typeof uploadContentSchema>;

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = [".txt", ".pdf"];

interface UploadFormProps {
  subjectOptions: Array<{ id: string; title: string }>;
}

export function UploadForm({ subjectOptions }: UploadFormProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [selection, setSelection] = React.useState<AiSelection>({ provider: "", model: "" });
  const [selectionError, setSelectionError] = React.useState<string | null>(null);
  const [lastResult, setLastResult] = React.useState<ContentDetailSnapshot | null>(null);

  const queryClient = useQueryClient();
  const { notify } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const aiSettings = useAiSettings();
  const hasProvider = Boolean(aiSettings.data?.providers.some((provider) => provider.connected));

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadContentSchema),
    defaultValues: { subjectId: "" },
  });

  const watchedSubject = form.watch("subjectId");
  const matchedSubject = subjectOptions.find(
    (subject) => subject.title.toLowerCase() === watchedSubject.trim().toLowerCase(),
  );

  const mutation = useMutation({
    mutationFn: uploadContent,
    onSuccess: (content) => {
      setLastResult(content);
      setSelectedFile(null);
      form.reset({ subjectId: "" });
      notify(
        content.processingStatus === "FAILED" ? "error" : "success",
        content.processingStatus === "FAILED"
          ? `"${content.title}" foi salva, mas o processamento falhou. Você pode tentar novamente na matéria.`
          : `"${content.title}" processada.`,
      );
      for (const key of ["dashboard", "subjects", "subject-options", "simulations", "subject"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });

  function chooseFile(file: File | undefined) {
    setLastResult(null);
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!ACCEPTED.some((extension) => lower.endsWith(extension))) {
      setFileError("Formato inválido. Envie um arquivo .txt ou .pdf.");
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("Arquivo maior que 4 MB.");
      setSelectedFile(null);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!selectedFile) {
      setFileError("Selecione ou arraste um arquivo .txt ou .pdf.");
      return;
    }
    if (!selection.provider || !selection.model) {
      setSelectionError("Escolha o provedor e o modelo de IA.");
      return;
    }
    setSelectionError(null);
    const formData = new FormData();
    formData.append("subjectId", values.subjectId.trim());
    formData.append("file", selectedFile);
    formData.append("provider", selection.provider);
    formData.append("model", selection.model);
    mutation.mutate(formData);
  });

  const isProcessing = mutation.isPending;
  const { errors } = form.formState;

  return (
    <div className="flex h-full flex-col rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6 md:p-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Enviar aula</h2>
          <p className="mt-1 text-sm text-muted-foreground">PDF ou TXT, até 4 MB.</p>
        </div>
        <Badge variant="secondary" className="shrink-0 border border-primary/20 bg-primary/10 text-primary">
          <Sparkles className="mr-1 h-3 w-3" aria-hidden /> IA
        </Badge>
      </div>

      <form id="upload-form" noValidate className="flex flex-1 flex-col gap-5" onSubmit={onSubmit}>
        <div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              if (!isProcessing) chooseFile(event.dataTransfer.files[0]);
            }}
            aria-describedby={fileError ? "upload-file-error" : "upload-file-hint"}
            className={`flex min-h-[132px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed p-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
              isDragActive ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/40 hover:bg-secondary/20"
            }`}
          >
            {selectedFile ? (
              <>
                <FileText className="mb-2 h-7 w-7 text-primary" aria-hidden />
                <span className="break-all text-sm font-medium">{selectedFile.name}</span>
                <span className="mt-0.5 text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · toque para trocar
                </span>
              </>
            ) : (
              <>
                <span className="mb-2 rounded-full bg-secondary p-3">
                  <UploadCloud className="h-5 w-5 text-muted-foreground" aria-hidden />
                </span>
                <span className="text-sm font-medium">Escolher arquivo</span>
                <span id="upload-file-hint" className="mt-0.5 text-xs text-muted-foreground">
                  ou arraste para cá
                </span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,text/plain,application/pdf"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              chooseFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <FieldError id="upload-file-error" message={fileError} />
        </div>

        <div>
          <Label htmlFor="upload-subject">
            Matéria <span className="font-normal text-muted-foreground">(existente ou nova)</span>
          </Label>
          <Input
            id="upload-subject"
            list="subjects-list"
            placeholder="Ex.: Matemática, Física…"
            disabled={isProcessing}
            autoComplete="off"
            className="mt-2"
            aria-invalid={Boolean(errors.subjectId)}
            {...form.register("subjectId")}
          />
          <datalist id="subjects-list">
            {subjectOptions.map((subject) => (
              <option key={subject.id} value={subject.title} />
            ))}
          </datalist>
          {watchedSubject.trim() ? (
            <p className={`mt-1.5 flex items-center gap-1 text-xs ${matchedSubject ? "text-success" : "text-primary"}`}>
              {matchedSubject ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <Plus className="h-3 w-3" aria-hidden />}
              {matchedSubject ? "Matéria existente" : "Uma nova matéria será criada"}
            </p>
          ) : null}
          <FieldError message={errors.subjectId?.message} />
        </div>

        <div>
          <AiModelPicker idPrefix="upload" value={selection} onChange={setSelection} disabled={isProcessing} />
          <FieldError message={selectionError} />
        </div>

        {mutation.isError ? (
          <Alert tone="danger" title="Não foi possível processar">
            {mutation.error.message}
          </Alert>
        ) : null}

        {isProcessing ? (
          <p role="status" className="text-sm text-muted-foreground">
            Analisando a aula com {selection.model}. Isso pode levar até alguns minutos; mantenha esta página aberta.
          </p>
        ) : null}

        {lastResult ? (
          <div className="space-y-2">
            <ProcessingDetails content={lastResult} />
            <Link
              href={`/subjects/${lastResult.subjectId}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Abrir {lastResult.subjectTitle} <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="mt-auto w-full" disabled={isProcessing || !hasProvider}>
          {isProcessing ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Processando…
            </>
          ) : (
            <>
              Processar aula <ArrowUpRight className="ml-2 h-4 w-4" aria-hidden />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
