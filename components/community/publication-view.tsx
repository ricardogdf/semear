"use client";

import Link from "next/link";
import { ExternalLink, Lock } from "lucide-react";

import { Alert, Badge } from "@/components/ui";
import { publicationTypeLabels, type PublicationSnapshot } from "@/lib/utils";

import { PublicationMeta } from "./cards";
import { LikeButton } from "./like-button";
import { ShareButton } from "./share-button";
import { UserAvatar } from "./user-avatar";

/**
 * Página de uma publicação acadêmica: metadados informados, curtidas e compartilhamento.
 * Não há importação. Se a publicação estiver em um repositório externo, o Semear só guarda o link.
 */
export function PublicationView({ publication, authenticated }: { publication: PublicationSnapshot; authenticated: boolean }) {
  const isPublic = publication.visibility === "PUBLIC";

  return (
    <article className="space-y-6">
      {!isPublic ? (
        <Alert tone="warning" title="Publicação privada">
          Só você vê esta página. Torne-a pública em Perfil público para compartilhar.
        </Alert>
      ) : null}

      <header className="rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{publicationTypeLabels[publication.type]}</Badge>
          {!isPublic ? (
            <Badge variant="warning">
              <Lock className="mr-1 h-3 w-3" aria-hidden /> Privada
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 break-words font-[var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
          {publication.title}
        </h1>
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">Autoria: </span>
          {publication.authors}
        </p>
        <PublicationMeta publication={publication} className="mt-2" />

        {isPublic ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <LikeButton
              publicationId={publication.id}
              title={publication.title}
              liked={publication.likedByMe}
              likeCount={publication.likeCount}
              authenticated={authenticated}
            />
            <ShareButton href={`/publications/${publication.id}`} />
          </div>
        ) : null}
      </header>

      {publication.abstract ? (
        <section aria-labelledby="abstract-title" className="rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6">
          <h2 id="abstract-title" className="text-lg font-semibold">
            Resumo
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{publication.abstract}</p>
        </section>
      ) : null}

      {publication.externalUrl ? (
        <section aria-labelledby="external-title" className="rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6">
          <h2 id="external-title" className="text-lg font-semibold">
            Texto completo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hospedado no repositório de origem. O Semear guarda apenas o link.
          </p>
          <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{publication.externalUrl}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={publication.externalUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Abrir no site original
              <span className="sr-only">(abre em nova aba)</span>
            </a>
            <ShareButton href={publication.externalUrl} label="Copiar link original" />
          </div>
        </section>
      ) : null}

      <footer className="flex items-center gap-3 rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6">
        <UserAvatar name={publication.owner.displayName} avatarUrl={publication.owner.avatarUrl} size="sm" />
        <p className="text-sm text-muted-foreground">
          Cadastrada por{" "}
          <Link href={`/profile/${publication.owner.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
            {publication.owner.displayName}
          </Link>{" "}
          em {new Date(publication.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </footer>
    </article>
  );
}
