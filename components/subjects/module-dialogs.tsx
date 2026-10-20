"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Trash2 } from "lucide-react";

import { Alert, Button, Input, Label, Modal, ModalContent, ModalDescription, ModalTitle } from "@/components/ui";

import { useToast } from "@/components/providers/toast-provider";
import { createModule, deleteModule, renameModule } from "@/lib/api";

interface ModuleRef {
  id: string;
  title: string;
}

/** Atualiza as telas que mostram os módulos, as aulas e o desempenho da matéria. */
export function useRefreshSubject(subjectId: string) {
  const queryClient = useQueryClient();
  return React.useCallback(() => {
    for (const queryKey of [["subject", subjectId], ["subjects"], ["subject-options"], ["simulations"], ["dashboard"]]) {
      void queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient, subjectId]);
}

interface ModuleFormProps {
  subjectId: string;
  /** Módulo a renomear; sem ele, o formulário cria um módulo novo. */
  editing?: ModuleRef | null;
  description?: string;
  onSaved?: (saved: ModuleRef) => void;
}

/** Fica dentro do conteúdo do modal: o estado recomeça a cada abertura. */
function ModuleForm({ subjectId, editing, description, onSaved, onDone }: ModuleFormProps & { onDone: () => void }) {
  const refresh = useRefreshSubject(subjectId);
  const { notify } = useToast();
  const [title, setTitle] = React.useState(editing?.title ?? "");

  const mutation = useMutation({
    mutationFn: () => (editing ? renameModule(editing.id, title.trim()) : createModule(subjectId, title.trim())),
    onSuccess: (saved) => {
      refresh();
      notify("success", editing ? "Módulo renomeado." : `Módulo "${saved.title}" criado.`);
      onDone();
      onSaved?.(saved);
    },
  });

  return (
    <>
      <ModalTitle>{editing ? "Renomear módulo" : "Novo módulo"}</ModalTitle>
      <ModalDescription className="mt-2">
        {description ??
          (editing
            ? "O novo nome aparece nas aulas, nos simulados e no histórico."
            : "Agrupe as aulas de um mesmo assunto, como Multiplicação ou Divisão em Matemática.")}
      </ModalDescription>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <Label htmlFor="module-title">Nome do módulo</Label>
          <Input
            id="module-title"
            className="mt-2"
            required
            maxLength={120}
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        {mutation.isError ? <Alert tone="danger">{mutation.error.message}</Alert> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || !title.trim()}>
            {mutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
            {editing ? "Salvar" : "Criar módulo"}
          </Button>
        </div>
      </form>
    </>
  );
}

export function ModuleFormModal({
  open,
  onOpenChange,
  ...props
}: ModuleFormProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModuleForm {...props} onDone={() => onOpenChange(false)} />
      </ModalContent>
    </Modal>
  );
}

/** Confirma a exclusão de um módulo; as aulas dele continuam na matéria. */
export function DeleteModuleModal({
  subjectId,
  target,
  onClose,
}: {
  subjectId: string;
  target: (ModuleRef & { contentCount: number }) | null;
  onClose: () => void;
}) {
  const refresh = useRefreshSubject(subjectId);
  const { notify } = useToast();
  const mutation = useMutation({
    mutationFn: (moduleId: string) => deleteModule(moduleId),
    onSuccess: () => {
      refresh();
      notify("success", "Módulo excluído.");
      onClose();
    },
    onError: (error) => notify("error", error.message),
  });

  return (
    <Modal open={Boolean(target)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <ModalContent>
        <ModalTitle>Excluir o módulo “{target?.title}”?</ModalTitle>
        <ModalDescription className="mt-2">
          {target?.contentCount ? "As aulas dele continuam na matéria, sem módulo. " : ""}
          Os simulados já feitos continuam no histórico.
        </ModalDescription>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => target && mutation.mutate(target.id)} disabled={mutation.isPending}>
            {mutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Excluir módulo
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
