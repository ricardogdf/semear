"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, IdCard, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";

import { Alert, Badge, Button, Input, Label, Modal, ModalContent, ModalDescription, ModalTitle, Textarea } from "@/components/ui";
import { publicationTypeLabels, type OwnProfileSnapshot, type PublicationSnapshot } from "@/lib/utils";

import { useToast } from "@/components/providers/toast-provider";
import { deletePublication, getOwnProfile, getOwnPublications, updateOwnProfile } from "@/lib/api";

import { EmptyState } from "./empty-state";
import { PageHeader } from "./page-header";
import { PublicationFormModal } from "./publication-form-modal";
import { UserAvatar } from "./user-avatar";

type ProfileForm = Record<"displayName" | "bio" | "institution" | "course" | "avatarUrl", string>;

const card = "rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6";

function toForm(profile: OwnProfileSnapshot): ProfileForm {
  return {
    displayName: profile.displayName ?? "",
    bio: profile.bio ?? "",
    institution: profile.institution ?? "",
    course: profile.course ?? "",
    avatarUrl: profile.avatarUrl ?? "",
  };
}

function ProfileFormSection({ profile }: { profile: OwnProfileSnapshot }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [values, setValues] = React.useState(() => toForm(profile));

  const mutation = useMutation({
    mutationFn: () => updateOwnProfile(values),
    onSuccess: (saved) => {
      queryClient.setQueryData(["own-profile"], saved);
      setValues(toForm(saved));
      notify("success", "Perfil atualizado.");
    },
  });

  const field = (key: keyof ProfileForm) => ({
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues({ ...values, [key]: event.target.value }),
  });

  return (
    <section aria-labelledby="profile-form-title" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="profile-form-title" className="font-semibold">
            Informações públicas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aparecem no seu perfil, que qualquer pessoa com o link pode abrir. Seu e-mail nunca é mostrado.
          </p>
        </div>
        <Link
          href={`/profile/${profile.id}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ver perfil público
        </Link>
      </div>

      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="flex items-center gap-4">
          <UserAvatar name={values.displayName.trim() || profile.name} avatarUrl={values.avatarUrl.startsWith("https://") ? values.avatarUrl : null} size="lg" />
          <div className="min-w-0 flex-1">
            <Label htmlFor="profile-avatar">Foto de perfil (opcional)</Label>
            <Input id="profile-avatar" className="mt-2" type="url" inputMode="url" maxLength={500} placeholder="https://…" aria-describedby="profile-avatar-help" {...field("avatarUrl")} />
            <p id="profile-avatar-help" className="mt-1.5 text-xs text-muted-foreground">
              Endereço https de uma imagem já publicada. Sem foto, mostramos suas iniciais.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="profile-display-name">Nome de exibição (opcional)</Label>
            <Input id="profile-display-name" className="mt-2" maxLength={80} placeholder={profile.name} aria-describedby="profile-display-name-help" {...field("displayName")} />
            <p id="profile-display-name-help" className="mt-1.5 text-xs text-muted-foreground">
              Vazio: usamos o nome da conta ({profile.name}).
            </p>
          </div>
          <div>
            <Label htmlFor="profile-institution">Universidade ou instituição</Label>
            <Input id="profile-institution" className="mt-2" maxLength={120} {...field("institution")} />
          </div>
          <div>
            <Label htmlFor="profile-course">Curso</Label>
            <Input id="profile-course" className="mt-2" maxLength={120} {...field("course")} />
          </div>
        </div>
        <div>
          <Label htmlFor="profile-bio">Biografia</Label>
          <Textarea id="profile-bio" className="mt-2" maxLength={500} placeholder="Áreas de interesse, pesquisa, semestre…" {...field("bio")} />
          <p className="mt-1.5 text-right text-xs text-muted-foreground">{values.bio.length}/500</p>
        </div>
        {mutation.isError ? <Alert tone="danger">{mutation.error.message}</Alert> : null}
        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Salvar perfil
          </Button>
        </div>
      </form>
    </section>
  );
}

function PublicationsSection() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const query = useQuery({ queryKey: ["own-publications"], queryFn: getOwnPublications });
  const [editing, setEditing] = React.useState<PublicationSnapshot | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<PublicationSnapshot | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["own-publications"] });
    for (const key of ["publications", "discover"]) {
      void queryClient.invalidateQueries({ queryKey: [key], refetchType: "none" });
    }
  };

  const remove = useMutation({
    mutationFn: (publication: PublicationSnapshot) => deletePublication(publication.id),
    onSuccess: () => {
      setDeleting(null);
      notify("success", "Publicação excluída.");
      refresh();
    },
    onError: (error) => notify("error", error.message),
  });

  return (
    <section aria-labelledby="own-publications-title" className={card}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="own-publications-title" className="flex items-center gap-2 font-semibold">
            <FileText className="h-5 w-5 text-primary" aria-hidden /> Artigos e publicações
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">As públicas aparecem no seu perfil e na biblioteca.</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Nova publicação
        </Button>
      </div>

      <div className="mt-5">
        {query.isPending ? (
          <div className="flex justify-center py-6" role="status">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden />
            <span className="sr-only">Carregando publicações…</span>
          </div>
        ) : query.isError ? (
          <Alert tone="danger" title="Não foi possível carregar suas publicações">
            {query.error.message}
          </Alert>
        ) : query.data.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhuma publicação cadastrada">
            Cadastre seus artigos, TCCs e outras publicações para compartilhá-los.
          </EmptyState>
        ) : (
          <ul className="grid gap-2">
            {query.data.map((publication) => (
              <li key={publication.id} className="flex flex-col gap-3 rounded-2xl border border-border/50 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="px-2 py-0 text-[11px]">
                      {publicationTypeLabels[publication.type]}
                    </Badge>
                    <Badge variant={publication.visibility === "PUBLIC" ? "success" : "warning"} className="px-2 py-0 text-[11px]">
                      {publication.visibility === "PUBLIC" ? "Pública" : "Privada"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {publication.likeCount} {publication.likeCount === 1 ? "curtida" : "curtidas"}
                    </span>
                  </div>
                  <Link href={`/publications/${publication.id}`} className="mt-1 block break-words font-medium underline-offset-4 hover:underline">
                    {publication.title}
                  </Link>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(publication);
                      setFormOpen(true);
                    }}
                    aria-label={`Editar “${publication.title}”`}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(publication)} aria-label={`Excluir “${publication.title}”`}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PublicationFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        publication={editing}
        onSaved={() => {
          notify("success", editing ? "Publicação atualizada." : "Publicação cadastrada.");
          refresh();
        }}
      />

      <Modal open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <ModalContent>
          <ModalTitle>Excluir “{deleting?.title}”?</ModalTitle>
          <ModalDescription className="mt-2">A publicação e as curtidas dela serão apagadas. O link deixará de funcionar.</ModalDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => deleting && remove.mutate(deleting)} disabled={remove.isPending}>
              {remove.isPending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="mr-2 h-4 w-4" aria-hidden />}
              Excluir publicação
            </Button>
          </div>
        </ModalContent>
      </Modal>
    </section>
  );
}

/** Edição do perfil público e gerenciamento das publicações do próprio usuário. */
export function ProfileSettings() {
  const query = useQuery({ queryKey: ["own-profile"], queryFn: getOwnProfile });

  return (
    <div className="space-y-6">
      <PageHeader icon={IdCard} title="Perfil público">
        Seus dados acadêmicos e publicações. Só você pode alterá-los.
      </PageHeader>
      {query.isPending ? (
        <div className="flex min-h-[160px] items-center justify-center" role="status">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary" aria-hidden />
          <span className="sr-only">Carregando perfil…</span>
        </div>
      ) : query.isError ? (
        <Alert tone="danger" title="Não foi possível carregar o perfil">
          {query.error.message}
        </Alert>
      ) : (
        <ProfileFormSection profile={query.data} />
      )}
      <PublicationsSection />
    </div>
  );
}
