"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpenCheck, Download, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui";
import type { ImportResult } from "@/lib/utils";

import { useToast } from "@/components/providers/toast-provider";
import { importSubject } from "@/lib/api";

import { useMarkCommunityStale } from "./follow-button";
import { LoginLink } from "./login-link";

const linkClass =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Importa uma matéria pública (só matérias têm este botão; publicações acadêmicas nunca).
 * Se ela já foi importada, oferece abrir a cópia existente em vez de importar de novo.
 */
export function ImportButton({
  subjectId,
  importedCopyId,
  isOwner,
  authenticated,
  onImported,
}: {
  subjectId: string;
  importedCopyId: string | null;
  isOwner: boolean;
  authenticated: boolean;
  onImported?: (result: ImportResult) => void;
}) {
  const queryClient = useQueryClient();
  const markStale = useMarkCommunityStale();
  const { notify } = useToast();
  const [copyId, setCopyId] = React.useState(importedCopyId);

  React.useEffect(() => setCopyId(importedCopyId), [importedCopyId]);

  const mutation = useMutation({
    mutationFn: () => importSubject(subjectId),
    onSuccess: (result) => {
      setCopyId(result.subjectId);
      onImported?.(result);
      notify(
        "success",
        result.alreadyImported
          ? "Você já tinha importado esta matéria. Abra a cópia na sua biblioteca."
          : "Matéria importada para a sua biblioteca.",
      );
      for (const key of ["subjects", "subject-options", "simulations", "dashboard"]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      markStale("library", "discover", "profile");
    },
    onError: (error) => notify("error", error.message),
  });

  if (isOwner) {
    return (
      <Link href={`/subjects/${subjectId}`} className={linkClass}>
        <BookOpenCheck className="h-3.5 w-3.5" aria-hidden /> Sua matéria
      </Link>
    );
  }
  if (!authenticated) return <LoginLink>Entrar para importar</LoginLink>;
  if (copyId) {
    return (
      <Link href={`/subjects/${copyId}`} className={linkClass}>
        <BookOpenCheck className="h-3.5 w-3.5 text-success" aria-hidden /> Já importada · abrir
      </Link>
    );
  }

  return (
    <Button type="button" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-1.5">
      {mutation.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}
      {mutation.isPending ? "Importando…" : "Importar"}
    </Button>
  );
}
