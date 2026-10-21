"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, Globe, LoaderCircle, Lock, Pencil } from "lucide-react";

import { Alert, Badge, Button, Label, Modal, ModalContent, ModalDescription, ModalTitle, Textarea } from "@/components/ui";
import { formatImportCount, type SubjectDetailSnapshot, type VisibilityValue } from "@/lib/utils";

import { ShareButton } from "@/components/community/share-button";
import { useToast } from "@/components/providers/toast-provider";
import { setSubjectVisibility } from "@/lib/api";

const card = "rounded-[2rem] border border-border/50 bg-card p-5 sm:p-6";
const linkButton =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Cópia importada: mostra a autoria e o original; nunca oferece publicar. */
function ImportedNotice({ subject }: { subject: SubjectDetailSnapshot }) {
  const origin = subject.importedFrom!;
  return (
    <section aria-labelledby="sharing-title" className={card}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="sharing-title" className="text-lg font-semibold">
          Matéria importada
        </h2>
        <Badge variant="secondary">
          <Download className="mr-1 h-3 w-3" aria-hidden /> Importada
        </Badge>
        <Badge variant="outline">
          <Lock className="mr-1 h-3 w-3" aria-hidden /> Privada
        </Badge>
      </div>
      <p className="mt-2 text-sm">
        Original: <strong>{origin.title}</strong>, de{" "}
        {origin.authorId ? (
          <Link href={`/profile/${origin.authorId}`} className="font-medium text-primary underline-offset-4 hover:underline">
            {origin.authorName}
          </Link>
        ) : (
          origin.authorName
        )}
        . Importada em {new Date(origin.importedAt).toLocaleDateString("pt-BR")}.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Cópias importadas são privadas e não podem ser publicadas. Para indicar esta matéria, compartilhe o original.
      </p>
      {origin.originalAvailable && origin.originalId ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/library/${origin.originalId}`} className={linkButton}>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ver original
          </Link>
          <ShareButton href={`/library/${origin.originalId}`} label="Copiar link do original" />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">O original não está mais disponível publicamente.</p>
      )}
    </section>
  );
}

/**
 * Visibilidade de uma matéria original: privada (só o dono) ou pública (perfil, biblioteca,
 * "Conheça" e importação). A regra é validada no servidor; esta tela só oferece as ações permitidas.
 */
export function SubjectSharing({ subject }: { subject: SubjectDetailSnapshot }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [dialog, setDialog] = React.useState<"publish" | "description" | "unpublish" | null>(null);
  const [description, setDescription] = React.useState(subject.description);

  const mutation = useMutation({
    mutationFn: (visibility: VisibilityValue) => setSubjectVisibility(subject.id, { visibility, description }),
    onSuccess: (updated, visibility) => {
      queryClient.setQueryData(["subject", subject.id], updated);
      void queryClient.invalidateQueries({ queryKey: ["subjects"] });
      for (const key of ["library", "discover", "profile"]) {
        void queryClient.invalidateQueries({ queryKey: [key], refetchType: "none" });
      }
      setDialog(null);
      notify(
        "success",
        dialog === "description"
          ? "Descrição atualizada."
          : visibility === "PUBLIC"
            ? "Matéria publicada na biblioteca."
            : "Matéria agora é privada.",
      );
    },
  });

  if (subject.importedFrom) return <ImportedNotice subject={subject} />;

  const isPublic = subject.visibility === "PUBLIC";
  const open = (next: NonNullable<typeof dialog>) => {
    mutation.reset();
    setDescription(subject.description);
    setDialog(next);
  };

  return (
    <section aria-labelledby="sharing-title" className={card}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="sharing-title" className="text-lg font-semibold">
              Compartilhamento
            </h2>
            <Badge variant={isPublic ? "success" : "outline"}>
              {isPublic ? <Globe className="mr-1 h-3 w-3" aria-hidden /> : <Lock className="mr-1 h-3 w-3" aria-hidden />}
              {isPublic ? "Pública" : "Privada"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPublic
              ? `Aparece no seu perfil e na biblioteca pública. ${formatImportCount(subject.importCount)}.`
              : "Só você vê esta matéria. Publique para que outros usuários possam encontrá-la e importá-la."}
          </p>
          {isPublic && subject.description ? (
            <p className="mt-2 line-clamp-2 text-sm">{subject.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {isPublic ? (
            <>
              <Link href={`/library/${subject.id}`} className={linkButton}>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ver página pública
              </Link>
              <ShareButton href={`/library/${subject.id}`} />
              <Button size="sm" variant="ghost" onClick={() => open("description")}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Descrição
              </Button>
              <Button size="sm" variant="ghost" onClick={() => open("unpublish")}>
                <Lock className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Tornar privada
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => open("publish")}>
              <Globe className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Publicar na biblioteca
            </Button>
          )}
        </div>
      </div>

      <Modal open={dialog === "publish" || dialog === "description"} onOpenChange={(next) => !next && setDialog(null)}>
        <ModalContent>
          <ModalTitle>{dialog === "publish" ? "Publicar matéria" : "Editar descrição"}</ModalTitle>
          {dialog === "publish" ? (
            <ModalDescription className="mt-2">
              Qualquer pessoa com o link verá o título, a descrição, seu nome e a lista de aulas com os resumos curtos.
              Usuários do Semear poderão importar uma cópia com o texto, os resumos e as questões. Suas notas e simulados
              continuam privados.
            </ModalDescription>
          ) : null}
          <form
            className="mt-5 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate("PUBLIC");
            }}
          >
            <div>
              <Label htmlFor="subject-description">Descrição (opcional)</Label>
              <Textarea
                id="subject-description"
                className="mt-2"
                maxLength={1000}
                placeholder="Para quem é esta matéria, curso, período, conteúdos…"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            {mutation.isError ? <Alert tone="danger">{mutation.error.message}</Alert> : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
                {dialog === "publish" ? "Publicar" : "Salvar"}
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>

      <Modal open={dialog === "unpublish"} onOpenChange={(next) => !next && setDialog(null)}>
        <ModalContent>
          <ModalTitle>Tornar a matéria privada?</ModalTitle>
          <ModalDescription className="mt-2">
            Ela sai do seu perfil, da biblioteca e dos rankings, e o link público deixa de funcionar. Quem já importou
            continua com a própria cópia, mas ninguém mais poderá importar.
          </ModalDescription>
          {mutation.isError ? <Alert tone="danger" className="mt-4">{mutation.error.message}</Alert> : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => mutation.mutate("PRIVATE")} disabled={mutation.isPending}>
              {mutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Lock className="mr-2 h-4 w-4" aria-hidden />}
              Tornar privada
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </section>
  );
}
