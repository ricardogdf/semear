"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";

import { Alert, Button, Input, Label, Modal, ModalContent, ModalDescription, ModalTitle, Select, Textarea } from "@/components/ui";
import { publicationTypeLabels, publicationTypeValues, type PublicationSnapshot } from "@/lib/utils";

import { createPublication, updatePublication, type PublicationPayload } from "@/lib/api";

const emptyForm: PublicationPayload = {
  type: "ARTICLE",
  title: "",
  authors: "",
  abstract: "",
  institution: "",
  publishedOn: "",
  externalUrl: "",
  visibility: "PUBLIC",
};

function toForm(publication: PublicationSnapshot | null): PublicationPayload {
  if (!publication) return emptyForm;
  return {
    type: publication.type,
    title: publication.title,
    authors: publication.authors,
    abstract: publication.abstract,
    institution: publication.institution ?? "",
    publishedOn: publication.publishedOn ?? "",
    externalUrl: publication.externalUrl ?? "",
    visibility: publication.visibility,
  };
}

/** Cadastro e edição de artigo/TCC. Campos opcionais vazios ficam vazios (nada é inventado). */
export function PublicationFormModal({
  open,
  onOpenChange,
  publication,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publication: PublicationSnapshot | null;
  onSaved: (saved: PublicationSnapshot) => void;
}) {
  const [values, setValues] = React.useState(() => toForm(publication));

  React.useEffect(() => {
    if (open) setValues(toForm(publication));
  }, [open, publication]);

  const mutation = useMutation({
    mutationFn: () => (publication ? updatePublication(publication.id, values) : createPublication(values)),
    onSuccess: (saved) => {
      onSaved(saved);
      onOpenChange(false);
    },
  });

  const set = <K extends keyof PublicationPayload>(key: K, value: PublicationPayload[K]) => setValues({ ...values, [key]: value });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) mutation.reset();
        onOpenChange(next);
      }}
    >
      <ModalContent className="w-[min(calc(100vw-2rem),40rem)]">
        <ModalTitle>{publication ? "Editar publicação" : "Nova publicação"}</ModalTitle>
        <ModalDescription className="mt-2">
          Artigos, TCCs e outras publicações podem ser vistos, curtidos e compartilhados, mas nunca importados como matéria.
        </ModalDescription>
        <form
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pub-type">Tipo</Label>
              <Select id="pub-type" className="mt-2" value={values.type} onChange={(event) => set("type", event.target.value as PublicationPayload["type"])}>
                {publicationTypeValues.map((type) => (
                  <option key={type} value={type}>
                    {publicationTypeLabels[type]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="pub-visibility">Visibilidade</Label>
              <Select id="pub-visibility" className="mt-2" value={values.visibility} onChange={(event) => set("visibility", event.target.value as PublicationPayload["visibility"])}>
                <option value="PUBLIC">Pública (perfil, biblioteca e link)</option>
                <option value="PRIVATE">Privada (só você)</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="pub-title">Título</Label>
            <Input id="pub-title" className="mt-2" required minLength={3} maxLength={300} value={values.title} onChange={(event) => set("title", event.target.value)} />
          </div>
          <div>
            <Label htmlFor="pub-authors">Autor(es)</Label>
            <Input id="pub-authors" className="mt-2" required minLength={2} maxLength={500} placeholder="Ex.: Ana Souza; Bruno Lima" value={values.authors} onChange={(event) => set("authors", event.target.value)} />
          </div>
          <div>
            <Label htmlFor="pub-abstract">Resumo (opcional)</Label>
            <Textarea id="pub-abstract" className="mt-2" maxLength={5000} value={values.abstract} onChange={(event) => set("abstract", event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pub-institution">Instituição (opcional)</Label>
              <Input id="pub-institution" className="mt-2" maxLength={160} value={values.institution} onChange={(event) => set("institution", event.target.value)} />
            </div>
            <div>
              <Label htmlFor="pub-date">Data de publicação (opcional)</Label>
              <Input id="pub-date" className="mt-2" type="date" min="1900-01-01" max="2100-12-31" value={values.publishedOn} onChange={(event) => set("publishedOn", event.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="pub-url">Link externo (opcional)</Label>
            <Input
              id="pub-url"
              className="mt-2"
              type="url"
              inputMode="url"
              maxLength={500}
              placeholder="https://repositorio.universidade.br/…"
              aria-describedby="pub-url-help"
              value={values.externalUrl}
              onChange={(event) => set("externalUrl", event.target.value)}
            />
            <p id="pub-url-help" className="mt-1.5 text-xs text-muted-foreground">
              Endereço no repositório de origem. O conteúdo externo não é copiado para o Semear.
            </p>
          </div>
          {mutation.isError ? <Alert tone="danger">{mutation.error.message}</Alert> : null}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending || values.title.trim().length < 3 || values.authors.trim().length < 2}>
              {mutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {publication ? "Salvar alterações" : "Cadastrar publicação"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
